// Validates the sound-analysis request. Everything here comes from the app and
// is untrusted: only known numeric fields and enums are passed on to Claude,
// so nothing free-form from the client can reach the prompt.
import { SOUND_CONTEXTS, type SoundContext } from "./voiceSchema.ts";

const NUMERIC_KEYS = [
  "durationSec",
  "activeSec",
  "callCount",
  "callsPerSec",
  "longestCallSec",
  "meanCallSec",
  "f0MedianHz",
  "f0LowHz",
  "f0HighHz",
  "f0RangeSemitones",
  "harmonicity",
  "spectralCentroidHz",
  "spectralFlatness",
  "lowFreqRatio",
  "lowPeriodicity",
  "peakDb",
  "meanActiveDb",
  "noiseFloorDb",
] as const;

const CALL_KEYS = ["startSec", "durationSec", "f0StartHz", "f0EndHz", "f0MaxHz", "meanDb", "harmonicity"] as const;
const CONTOURS = ["rising", "falling", "arched", "flat", "varied"];

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;

export type CleanFeatures = Record<string, number | string | null | Record<string, number | null>[]>;

export function sanitizeFeatures(raw: unknown): CleanFeatures | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: CleanFeatures = {};
  for (const k of NUMERIC_KEYS) out[k] = num(r[k]);
  const duration = out.durationSec;
  if (typeof duration !== "number" || duration <= 0 || duration > 15) return null;
  out.pitchContour = typeof r.pitchContour === "string" && CONTOURS.includes(r.pitchContour) ? r.pitchContour : null;
  out.calls = (Array.isArray(r.calls) ? r.calls : []).slice(0, 12).map((c) => {
    const call = (c ?? {}) as Record<string, unknown>;
    return Object.fromEntries(CALL_KEYS.map((k) => [k, num(call[k])]));
  });
  return out;
}

export function parseContext(v: unknown): SoundContext {
  return typeof v === "string" && (SOUND_CONTEXTS as readonly string[]).includes(v)
    ? (v as SoundContext)
    : "other";
}
