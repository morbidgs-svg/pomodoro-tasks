// Shape of a vocalisation (sound) analysis. Shares moods, product categories
// and the level/vet-advice scales with the face analysis so the app can
// render both the same way.
import { MOODS, PRODUCT_CATEGORIES, type Mood, type ProductCategory } from "./schema.ts";

export const SOUND_SOURCES = ["cat", "dog", "unclear", "not_pet"] as const;

export const SOUND_TYPES = [
  // cats
  "meow",
  "trill",
  "purr",
  "hiss",
  "growl",
  "yowl",
  "chatter",
  // dogs
  "bark",
  "whine",
  "howl",
  "yelp",
  "grunt",
  // either
  "unclear",
] as const;

export const CONDITIONS = ["calm", "normal", "excited", "stressed", "possible_discomfort", "unclear"] as const;

export const NEEDS = [
  "attention",
  "food",
  "play",
  "rest",
  "go_out",
  "comfort",
  "space",
  "check_health",
] as const;

export const SOUND_CUES = ["pitch", "length", "repetition", "loudness", "rhythm", "tone", "context"] as const;

export const VOICE_HEALTH_AREAS = [
  "voice_quality",
  "call_frequency",
  "pain_sounds",
  "breathing",
  "night_calls",
] as const;

export const SOUND_CONTEXTS = [
  "before_meal",
  "seeking_owner",
  "playing",
  "being_touched",
  "stranger_or_noise",
  "travel_or_vet",
  "night",
  "other",
] as const;

export type SoundSource = (typeof SOUND_SOURCES)[number];
export type SoundType = (typeof SOUND_TYPES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type Need = (typeof NEEDS)[number];
export type SoundCue = (typeof SOUND_CUES)[number];
export type VoiceHealthArea = (typeof VOICE_HEALTH_AREAS)[number];
export type SoundContext = (typeof SOUND_CONTEXTS)[number];

export interface VoiceModelAnalysis {
  source: SoundSource;
  sound_type: SoundType;
  mood: {
    primary: Mood;
    confidence: "low" | "medium" | "high";
    headline: string;
    pet_voice: string;
    explanation: string;
  };
  arousal: "low" | "medium" | "high";
  condition: Condition;
  likely_needs: Need[];
  cues: { cue: SoundCue; observation: string; meaning: string }[];
  health_signs: { area: VoiceHealthArea; finding: string; level: "ok" | "watch" | "concern" }[];
  health_summary: string;
  care_tips: string[];
  recommended_categories: ProductCategory[];
  vet_advice: "none" | "monitor" | "consult";
}

export interface VoiceAnalysisResponse extends VoiceModelAnalysis {
  kind: "voice";
  /** True when the clip held a recognisable dog or cat vocalisation. */
  usable: boolean;
  model: string;
  createdAt: string;
}

export const VOICE_JSON_SCHEMA = {
  type: "object",
  properties: {
    source: { type: "string", enum: [...SOUND_SOURCES] },
    sound_type: { type: "string", enum: [...SOUND_TYPES] },
    mood: {
      type: "object",
      properties: {
        primary: { type: "string", enum: [...MOODS] },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        headline: { type: "string" },
        pet_voice: { type: "string" },
        explanation: { type: "string" },
      },
      required: ["primary", "confidence", "headline", "pet_voice", "explanation"],
      additionalProperties: false,
    },
    arousal: { type: "string", enum: ["low", "medium", "high"] },
    condition: { type: "string", enum: [...CONDITIONS] },
    likely_needs: { type: "array", items: { type: "string", enum: [...NEEDS] } },
    cues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cue: { type: "string", enum: [...SOUND_CUES] },
          observation: { type: "string" },
          meaning: { type: "string" },
        },
        required: ["cue", "observation", "meaning"],
        additionalProperties: false,
      },
    },
    health_signs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area: { type: "string", enum: [...VOICE_HEALTH_AREAS] },
          finding: { type: "string" },
          level: { type: "string", enum: ["ok", "watch", "concern"] },
        },
        required: ["area", "finding", "level"],
        additionalProperties: false,
      },
    },
    health_summary: { type: "string" },
    care_tips: { type: "array", items: { type: "string" } },
    recommended_categories: {
      type: "array",
      items: { type: "string", enum: [...PRODUCT_CATEGORIES] },
    },
    vet_advice: { type: "string", enum: ["none", "monitor", "consult"] },
  },
  required: [
    "source",
    "sound_type",
    "mood",
    "arousal",
    "condition",
    "likely_needs",
    "cues",
    "health_signs",
    "health_summary",
    "care_tips",
    "recommended_categories",
    "vet_advice",
  ],
  additionalProperties: false,
} as const;

/** A clip is usable when it holds a recognisable dog or cat sound. */
export function voiceUsable(v: Pick<VoiceModelAnalysis, "source" | "sound_type">): boolean {
  return (v.source === "cat" || v.source === "dog") && v.sound_type !== "unclear";
}
