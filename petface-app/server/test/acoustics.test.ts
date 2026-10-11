import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeAudio } from "../../src/lib/acoustics.ts";

const RATE = 48000;

// Deterministic noise so the tests never flake.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296 - 0.5;
  };
}

function silence(sec: number, level = 0.0005, seed = 1) {
  const r = rng(seed);
  return Float32Array.from({ length: Math.round(sec * RATE) }, () => r() * level);
}

function concat(...parts: Float32Array[]) {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Harmonic tone gliding f0 -> f1, with a soft fade in/out. */
function sweep(sec: number, f0: number, f1: number, amp = 0.3) {
  const n = Math.round(sec * RATE);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = f0 + (f1 - f0) * t;
    phase += (2 * Math.PI * f) / RATE;
    const env = Math.min(1, i / (0.02 * RATE), (n - i) / (0.02 * RATE));
    out[i] = amp * env * (Math.sin(phase) + 0.4 * Math.sin(2 * phase) + 0.2 * Math.sin(3 * phase));
  }
  return out;
}

function noise(sec: number, amp = 0.3, seed = 7) {
  const r = rng(seed);
  return Float32Array.from({ length: Math.round(sec * RATE) }, () => r() * 2 * amp);
}

/** Purr-like: 26 Hz pulse train of short low-frequency bursts. */
function purr(sec: number) {
  const n = Math.round(sec * RATE);
  const out = new Float32Array(n);
  const period = RATE / 26;
  for (let i = 0; i < n; i++) {
    const ph = (i % period) / period;
    const burst = ph < 0.35 ? Math.sin((Math.PI * ph) / 0.35) : 0;
    out[i] = 0.3 * burst * Math.sin((2 * Math.PI * 120 * i) / RATE);
  }
  return out;
}

test("silence has no sound", () => {
  const a = analyzeAudio(silence(2), RATE);
  assert.equal(a.hasSound, false);
});

test("a rising meow-like call: one call, tonal, rising, pitch in range", () => {
  const a = analyzeAudio(concat(silence(0.5), sweep(0.9, 500, 800), silence(0.5)), RATE);
  assert.equal(a.hasSound, true);
  assert.equal(a.features.callCount, 1);
  assert.equal(a.features.pitchContour, "rising");
  assert.ok(a.features.harmonicity > 0.7, `harmonicity ${a.features.harmonicity}`);
  assert.ok(a.features.f0MedianHz! > 550 && a.features.f0MedianHz! < 750, `f0 ${a.features.f0MedianHz}`);
  assert.ok(Math.abs(a.features.longestCallSec - 0.9) < 0.15, `len ${a.features.longestCallSec}`);
});

test("a falling call is detected as falling", () => {
  const a = analyzeAudio(concat(silence(0.4), sweep(1.0, 700, 350), silence(0.4)), RATE);
  assert.equal(a.features.pitchContour, "falling");
});

test("hiss-like noise is noisy, not tonal", () => {
  const a = analyzeAudio(concat(silence(0.4), noise(1.0), silence(0.4)), RATE);
  assert.equal(a.hasSound, true);
  assert.ok(a.features.spectralFlatness > 0.3, `flatness ${a.features.spectralFlatness}`);
  assert.ok(a.features.harmonicity < 0.5, `harmonicity ${a.features.harmonicity}`);
});

test("three short barks are counted as three calls", () => {
  const bark = () => concat(sweep(0.18, 400, 380, 0.5), noise(0.04, 0.2));
  const a = analyzeAudio(
    concat(silence(0.3), bark(), silence(0.35), bark(), silence(0.35), bark(), silence(0.4)),
    RATE,
  );
  assert.equal(a.features.callCount, 3);
  assert.ok(a.features.meanCallSec < 0.4, `mean ${a.features.meanCallSec}`);
});

test("purr-like rumble has low-frequency energy and periodicity", () => {
  const a = analyzeAudio(concat(silence(0.3), purr(2), silence(0.3)), RATE);
  assert.equal(a.hasSound, true);
  assert.ok(a.features.lowFreqRatio > 0.5, `lowFreqRatio ${a.features.lowFreqRatio}`);
  assert.ok(a.features.lowPeriodicity > 0.5, `lowPeriodicity ${a.features.lowPeriodicity}`);
});

test("spectrogram and envelope have the promised shape", () => {
  const a = analyzeAudio(concat(silence(0.5), sweep(1, 500, 800), silence(0.5)), RATE);
  const bytes = Buffer.from(a.spectrogram.data, "base64");
  assert.equal(a.spectrogram.bands, 48);
  assert.equal(bytes.length, a.spectrogram.bands * a.spectrogram.frames);
  assert.equal(a.envelope.length, 60);
  assert.ok(a.envelope.every((v) => v >= 0 && v <= 1));
});

test("10 seconds of audio analyses in reasonable time", () => {
  const clip = concat(...Array.from({ length: 10 }, () => sweep(0.6, 400, 700)), silence(4));
  const t = Date.now();
  analyzeAudio(clip, RATE);
  const ms = Date.now() - t;
  assert.ok(ms < 3000, `took ${ms} ms`);
  console.log(`  10s clip analysed in ${ms} ms (Node)`);
});
