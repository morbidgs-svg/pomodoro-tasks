// Turns a short microphone recording into numbers Claude can reason about.
// Claude can't listen to audio, so the app measures the sound on the device
// (pitch, length, repetition, loudness, noisiness, purr-like low rumble) and
// draws a mel spectrogram the server renders as an image.
//
// Pure TypeScript with no React Native imports so it can be unit-tested in Node.

export const TARGET_RATE = 16000;
const FRAME = 1024; // 64 ms
const HOP = 512; // 32 ms
const MEL_BANDS = 48;
const MAX_COLUMNS = 160;
const MIN_F0 = 80;
const MAX_F0 = 2000;

export type PitchContour = "rising" | "falling" | "arched" | "flat" | "varied";

export interface CallSummary {
  startSec: number;
  durationSec: number;
  f0StartHz: number | null;
  f0EndHz: number | null;
  f0MaxHz: number | null;
  meanDb: number;
  harmonicity: number;
}

export interface VoiceFeatures {
  durationSec: number;
  activeSec: number;
  callCount: number;
  callsPerSec: number;
  longestCallSec: number;
  meanCallSec: number;
  f0MedianHz: number | null;
  f0LowHz: number | null;
  f0HighHz: number | null;
  f0RangeSemitones: number | null;
  pitchContour: PitchContour | null;
  harmonicity: number;
  spectralCentroidHz: number;
  spectralFlatness: number;
  lowFreqRatio: number;
  lowPeriodicity: number;
  peakDb: number;
  meanActiveDb: number;
  noiseFloorDb: number;
  calls: CallSummary[];
}

export interface Spectrogram {
  bands: number;
  frames: number;
  /** Row-major (band 0 = lowest frequency), one byte per cell, base64. */
  data: string;
}

export interface AcousticAnalysis {
  hasSound: boolean;
  features: VoiceFeatures;
  spectrogram: Spectrogram;
  /** 60 loudness values in 0..1 for drawing a waveform-style bar chart. */
  envelope: number[];
}

// ── small DSP helpers ────────────────────────────────────────────────────────

/** Box-filter decimation to 16 kHz; good enough for features below 8 kHz. */
export function resample(input: Float32Array, rate: number): Float32Array {
  return resampleTo(input, rate, TARGET_RATE);
}

function resampleTo(input: Float32Array, rate: number, target: number): Float32Array {
  if (Math.abs(rate - target) < 1) return input;
  const factor = rate / target;
  const outLen = Math.floor(input.length / factor);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * factor);
    const end = Math.max(start + 1, Math.floor((i + 1) * factor));
    let sum = 0;
    for (let j = start; j < end && j < input.length; j++) sum += input[j];
    out[i] = sum / (end - start);
  }
  return out;
}

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const HANN = (() => {
  const w = new Float64Array(FRAME);
  for (let i = 0; i < FRAME; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1));
  return w;
})();

// Autocorrelation of the Hann window itself, used to undo the window's taper
// when estimating pitch from a frame's power spectrum.
const HANN_AC = (() => {
  const maxLag = Math.ceil(TARGET_RATE / MIN_F0);
  const r = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < FRAME; i++) sum += HANN[i] * HANN[i + lag];
    r[lag] = sum;
  }
  return r;
})();

const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
const melToHz = (mel: number) => 700 * (10 ** (mel / 2595) - 1);

const MEL_FILTERS = (() => {
  const bins = FRAME / 2 + 1;
  const lo = hzToMel(60);
  const hi = hzToMel(TARGET_RATE / 2);
  const points = Array.from({ length: MEL_BANDS + 2 }, (_, i) =>
    Math.floor(((FRAME + 1) * melToHz(lo + ((hi - lo) * i) / (MEL_BANDS + 1))) / TARGET_RATE),
  );
  return Array.from({ length: MEL_BANDS }, (_, m) => {
    const f = new Float64Array(bins);
    const [a, b, c] = [points[m], points[m + 1], points[m + 2]];
    for (let k = a; k < b; k++) f[k] = (k - a) / Math.max(1, b - a);
    for (let k = b; k <= c && k < bins; k++) f[k] = (c - k) / Math.max(1, c - b);
    // Only the non-zero span is iterated per frame.
    return { weights: f, from: a, to: Math.min(c, bins - 1) };
  });
})();

/** Normalised autocorrelation peak within [minLag, maxLag]. */
function bestPeriod(x: Float32Array, start: number, len: number, minLag: number, maxLag: number) {
  const corr = new Float64Array(maxLag + 1);
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let r = 0;
    let e0 = 0;
    let el = 0;
    const n = len - lag;
    for (let i = 0; i < n; i++) {
      const a = x[start + i];
      const b = x[start + i + lag];
      r += a * b;
      e0 += a * a;
      el += b * b;
    }
    const c = e0 > 1e-9 && el > 1e-9 ? r / Math.sqrt(e0 * el) : 0;
    corr[lag] = c;
    if (c > best) best = c;
  }
  return pickPeak(corr, minLag, maxLag, best);
}

/** Octave guard: the shortest lag that is a local peak nearly as strong as the best. */
function pickPeak(corr: Float64Array, minLag: number, maxLag: number, best: number) {
  if (best <= 0) return { lag: 0, strength: 0 };
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    const c = corr[lag];
    if (c >= 0.9 * best && c >= corr[lag - 1] && c >= corr[lag + 1]) return { lag, strength: c };
  }
  return { lag: 0, strength: best };
}

/**
 * Pitch from a frame's power spectrum: the inverse FFT of the power spectrum
 * is the frame's autocorrelation (Wiener-Khinchin), corrected for the window.
 * One extra FFT instead of a lag-by-lag loop - much cheaper on phones.
 */
function pitchFromPower(power: Float64Array, minLag: number, maxLag: number) {
  const re = new Float64Array(FRAME);
  const im = new Float64Array(FRAME);
  for (let k = 0; k <= FRAME / 2; k++) {
    re[k] = power[k];
    if (k > 0 && k < FRAME / 2) re[FRAME - k] = power[k];
  }
  fft(re, im); // real & symmetric input: forward FFT equals the inverse up to scale
  const r0 = re[0];
  if (r0 <= 1e-12) return { lag: 0, strength: 0 };
  const corr = new Float64Array(maxLag + 1);
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const c = Math.min(1, re[lag] / r0 / (HANN_AC[lag] / HANN_AC[0]));
    corr[lag] = c;
    if (c > best) best = c;
  }
  return pickPeak(corr, minLag, maxLag, best);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))];
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : "=";
    out += i + 2 < bytes.length ? B64[c & 63] : "=";
  }
  return out;
}

function contourOf(f0s: number[]): PitchContour | null {
  if (f0s.length < 3) return null;
  const third = Math.max(1, Math.floor(f0s.length / 3));
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const start = mean(f0s.slice(0, third));
  const mid = mean(f0s.slice(third, f0s.length - third).length ? f0s.slice(third, f0s.length - third) : f0s);
  const end = mean(f0s.slice(-third));
  if (mid > start * 1.08 && mid > end * 1.08) return "arched";
  if (end > start * 1.1) return "rising";
  if (end < start / 1.1) return "falling";
  const max = Math.max(...f0s);
  const min = Math.min(...f0s);
  return max / min < 1.12 ? "flat" : "varied";
}

// ── main entry ──────────────────────────────────────────────────────────────

export function analyzeAudio(raw: Float32Array, sampleRate: number): AcousticAnalysis {
  const x = resample(raw, sampleRate);
  const durationSec = x.length / TARGET_RATE;
  const frameCount = Math.max(0, Math.floor((x.length - FRAME) / HOP) + 1);
  const binHz = TARGET_RATE / FRAME;
  const maxBin = FRAME / 2;
  const lowBin = Math.round(300 / binHz);

  const db: number[] = [];
  const centroid: number[] = [];
  const flatness: number[] = [];
  const lowRatio: number[] = [];
  const mel: Float64Array[] = [];
  const powers: Float64Array[] = [];
  const re = new Float64Array(FRAME);
  const im = new Float64Array(FRAME);

  for (let f = 0; f < frameCount; f++) {
    const off = f * HOP;
    let energy = 0;
    for (let i = 0; i < FRAME; i++) {
      const v = x[off + i];
      energy += v * v;
      re[i] = v * HANN[i];
      im[i] = 0;
    }
    db.push(10 * Math.log10(energy / FRAME + 1e-12));
    fft(re, im);
    let total = 0;
    let weighted = 0;
    let logSum = 0;
    let low = 0;
    const power = new Float64Array(maxBin + 1);
    power[0] = re[0] * re[0] + im[0] * im[0];
    for (let k = 1; k <= maxBin; k++) {
      const p = re[k] * re[k] + im[k] * im[k] + 1e-12;
      power[k] = p;
      total += p;
      weighted += p * k * binHz;
      logSum += Math.log(p);
      if (k <= lowBin) low += p;
    }
    centroid.push(weighted / total);
    flatness.push(Math.exp(logSum / maxBin) / (total / maxBin));
    lowRatio.push(low / total);
    const bands = new Float64Array(MEL_BANDS);
    for (let m = 0; m < MEL_BANDS; m++) {
      let s = 0;
      const { weights, from, to } = MEL_FILTERS[m];
      for (let k = from; k <= to; k++) s += weights[k] * power[k];
      bands[m] = 10 * Math.log10(s + 1e-12);
    }
    mel.push(bands);
    powers.push(power);
  }
  // Purr energy sits below ~1 kHz, so its periodicity is checked on a copy
  // decimated to 2 kHz, which makes the long-lag search cheap.
  const PURR_RATE = 2000;
  const x2k = resampleTo(x, TARGET_RATE, PURR_RATE);

  const peakDb = db.length ? Math.max(...db) : -120;
  const noiseFloorDb = percentile(db, 0.15);
  const threshold = Math.max(noiseFloorDb + 12, peakDb - 40, -55);
  const active = db.map((v) => v > threshold);

  // Group active frames into calls, bridging gaps up to ~100 ms.
  const segments: [number, number][] = [];
  let segStart = -1;
  let gap = 0;
  for (let f = 0; f < frameCount; f++) {
    if (active[f]) {
      if (segStart < 0) segStart = f;
      gap = 0;
    } else if (segStart >= 0) {
      gap++;
      if (gap > 3) {
        segments.push([segStart, f - gap]);
        segStart = -1;
        gap = 0;
      }
    }
  }
  if (segStart >= 0) segments.push([segStart, frameCount - 1 - gap]);
  const calls = segments.filter(([a, b]) => b - a + 1 >= 2);

  const minLag = Math.floor(TARGET_RATE / MAX_F0);
  const maxLag = Math.ceil(TARGET_RATE / MIN_F0);
  const purrMinLag = Math.floor(PURR_RATE / 150);
  const purrMaxLag = Math.ceil(PURR_RATE / 25);
  const purrWin = 256; // 128 ms

  const voicedF0: number[] = [];
  const harmonics: number[] = [];
  const purr: number[] = [];
  const callSummaries: CallSummary[] = [];
  const callContours: PitchContour[] = [];

  for (const [a, b] of calls) {
    const f0s: number[] = [];
    const hs: number[] = [];
    const dbs: number[] = [];
    for (let f = a; f <= b; f++) {
      dbs.push(db[f]);
      const { lag, strength } = pitchFromPower(powers[f], minLag, maxLag);
      hs.push(strength);
      if (lag > 0 && strength >= 0.6) f0s.push(TARGET_RATE / lag);
      const p2 = Math.floor((f * HOP * PURR_RATE) / TARGET_RATE);
      if ((f - a) % 2 === 0 && p2 + purrWin <= x2k.length) {
        purr.push(bestPeriod(x2k, p2, purrWin, purrMinLag, purrMaxLag).strength);
      }
    }
    voicedF0.push(...f0s);
    harmonics.push(...hs);
    const contour = contourOf(f0s);
    if (contour) callContours.push(contour);
    callSummaries.push({
      startSec: round((a * HOP) / TARGET_RATE),
      durationSec: round(((b - a + 1) * HOP + FRAME - HOP) / TARGET_RATE),
      f0StartHz: f0s.length ? Math.round(f0s[0]) : null,
      f0EndHz: f0s.length ? Math.round(f0s[f0s.length - 1]) : null,
      f0MaxHz: f0s.length ? Math.round(Math.max(...f0s)) : null,
      meanDb: round(dbs.reduce((s, v) => s + v, 0) / dbs.length, 1),
      harmonicity: round(hs.reduce((s, v) => s + v, 0) / hs.length),
    });
  }

  const activeIdx = active.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  const pick = (arr: number[]) => activeIdx.map((i) => arr[i]);
  const mean = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
  const activeSec = (activeIdx.length * HOP) / TARGET_RATE;
  const durations = callSummaries.map((c) => c.durationSec);

  const f0Low = voicedF0.length ? percentile(voicedF0, 0.1) : null;
  const f0High = voicedF0.length ? percentile(voicedF0, 0.9) : null;
  const contourCounts = new Map<PitchContour, number>();
  callContours.forEach((c) => contourCounts.set(c, (contourCounts.get(c) ?? 0) + 1));
  const topContour = [...contourCounts.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? null;

  const features: VoiceFeatures = {
    durationSec: round(durationSec),
    activeSec: round(activeSec),
    callCount: calls.length,
    callsPerSec: round(durationSec ? calls.length / durationSec : 0),
    longestCallSec: round(durations.length ? Math.max(...durations) : 0),
    meanCallSec: round(mean(durations)),
    f0MedianHz: voicedF0.length ? Math.round(percentile(voicedF0, 0.5)) : null,
    f0LowHz: f0Low !== null ? Math.round(f0Low) : null,
    f0HighHz: f0High !== null ? Math.round(f0High) : null,
    f0RangeSemitones: f0Low && f0High ? round(12 * Math.log2(f0High / f0Low), 1) : null,
    pitchContour: topContour,
    harmonicity: round(mean(harmonics)),
    spectralCentroidHz: Math.round(mean(pick(centroid))),
    spectralFlatness: round(mean(pick(flatness)), 3),
    lowFreqRatio: round(mean(pick(lowRatio))),
    lowPeriodicity: round(purr.length ? percentile(purr, 0.5) : 0),
    peakDb: round(peakDb, 1),
    meanActiveDb: round(mean(pick(db)), 1),
    noiseFloorDb: round(noiseFloorDb, 1),
    calls: callSummaries.slice(0, 12),
  };

  // Spectrogram: average frames into at most MAX_COLUMNS columns, 70 dB range.
  const columns = Math.min(MAX_COLUMNS, Math.max(1, frameCount));
  const melMax = mel.length ? Math.max(...mel.map((b) => Math.max(...b))) : 0;
  const cells = new Uint8Array(MEL_BANDS * columns);
  for (let c = 0; c < columns; c++) {
    const from = Math.floor((c * frameCount) / columns);
    const to = Math.max(from + 1, Math.floor(((c + 1) * frameCount) / columns));
    for (let m = 0; m < MEL_BANDS; m++) {
      let s = 0;
      let n = 0;
      for (let f = from; f < to && f < mel.length; f++) {
        s += mel[f][m];
        n++;
      }
      const v = n ? s / n : melMax - 70;
      cells[m * columns + c] = Math.round(Math.min(1, Math.max(0, (v - (melMax - 70)) / 70)) * 255);
    }
  }

  const envelope = Array.from({ length: 60 }, (_, i) => {
    const from = Math.floor((i * frameCount) / 60);
    const to = Math.max(from + 1, Math.floor(((i + 1) * frameCount) / 60));
    const seg = db.slice(from, to);
    const v = seg.length ? Math.max(...seg) : noiseFloorDb;
    return round(Math.min(1, Math.max(0, (v - noiseFloorDb) / Math.max(1, peakDb - noiseFloorDb))));
  });

  return {
    hasSound: activeSec >= 0.15 && peakDb > -50 && calls.length > 0,
    features,
    spectrogram: { bands: MEL_BANDS, frames: columns, data: toBase64(cells) },
    envelope,
  };
}
