import { encode } from "fast-png";

// Renders the app's mel spectrogram (bytes 0-255, band 0 = lowest pitch) as a
// PNG for Claude: low frequencies at the bottom, time left to right, and a
// faint vertical line every second.

export interface SpectrogramInput {
  bands: number;
  frames: number;
  data: string; // base64
}

const STOPS: [number, number, number][] = [
  [0, 0, 4],
  [80, 18, 123],
  [183, 55, 121],
  [251, 136, 97],
  [252, 253, 191],
];

function colour(v: number): [number, number, number] {
  const t = (v / 255) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t));
  const f = t - i;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  return [0, 1, 2].map((c) => Math.round(a[c] + (b[c] - a[c]) * f)) as [number, number, number];
}

export function decodeSpectrogram(input: SpectrogramInput): Uint8Array | null {
  const { bands, frames } = input;
  if (!Number.isInteger(bands) || !Number.isInteger(frames)) return null;
  if (bands < 8 || bands > 128 || frames < 1 || frames > 400) return null;
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(input.data), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
  return bytes.length === bands * frames ? bytes : null;
}

export function renderSpectrogramPng(
  cells: Uint8Array,
  bands: number,
  frames: number,
  durationSec: number,
): Uint8Array {
  const cellW = Math.max(1, Math.floor(640 / frames));
  const cellH = 5;
  const width = frames * cellW;
  const height = bands * cellH;
  const data = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    const band = bands - 1 - Math.floor(y / cellH); // low pitch at the bottom
    for (let x = 0; x < width; x++) {
      const [r, g, b] = colour(cells[band * frames + Math.floor(x / cellW)]);
      const o = (y * width + x) * 3;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
    }
  }
  // One faint line per second so the model can read durations off the image.
  if (durationSec > 0) {
    for (let s = 1; s < durationSec; s++) {
      const x = Math.round((s / durationSec) * width);
      for (let y = 0; y < height; y += 2) {
        const o = (y * width + x) * 3;
        data[o] = data[o + 1] = data[o + 2] = 200;
      }
    }
  }
  return encode({ width, height, data, channels: 3, depth: 8 });
}

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}
