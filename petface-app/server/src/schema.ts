// Shape of the analysis Claude returns (enforced with structured outputs),
// plus the derived fields the server adds before replying to the app.

export const SPECIES = ["cat", "dog", "other_animal", "no_animal"] as const;

export const MOODS = [
  "relaxed",
  "happy",
  "curious",
  "playful",
  "sleepy",
  "alert",
  "excited",
  "anxious",
  "annoyed",
  "fearful",
  "uncomfortable",
] as const;

export const CUE_PARTS = ["ears", "eyes", "brow", "whiskers", "mouth", "head", "body"] as const;

export const HEALTH_AREAS = [
  "eyes",
  "ears",
  "nose",
  "mouth_teeth",
  "skin_coat",
  "face_tension",
  "posture",
] as const;

export const PRODUCT_CATEGORIES = [
  "toy",
  "chew",
  "scratcher",
  "treat",
  "calming",
  "bed",
  "grooming",
  "dental",
  "water",
  "walk",
  "health_check",
] as const;

export const CAT_PAIN_UNITS = [
  "ear_position",
  "orbital_tightening",
  "muzzle_tension",
  "whiskers_change",
  "head_position",
] as const;

export type Species = (typeof SPECIES)[number];
export type Mood = (typeof MOODS)[number];
export type CuePart = (typeof CUE_PARTS)[number];
export type HealthArea = (typeof HEALTH_AREAS)[number];
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type CatPainUnit = (typeof CAT_PAIN_UNITS)[number];

export interface PainUnitScore {
  visible: boolean;
  score: 0 | 1 | 2;
  note: string;
}

export interface ModelAnalysis {
  species: Species;
  face_visible: boolean;
  image_quality: "good" | "fair" | "poor";
  mood: {
    primary: Mood;
    confidence: "low" | "medium" | "high";
    headline: string;
    pet_voice: string;
    explanation: string;
  };
  cues: { part: CuePart; observation: string; meaning: string }[];
  health_signs: { area: HealthArea; finding: string; level: "ok" | "watch" | "concern" }[];
  cat_pain_check: Record<CatPainUnit, PainUnitScore> & { summary: string };
  health_summary: string;
  care_tips: string[];
  recommended_categories: ProductCategory[];
  vet_advice: "none" | "monitor" | "consult";
}

export type PainLevel = "insufficient" | "low" | "mild" | "high";

export interface PainSummary {
  total: number;
  max: number;
  scoredUnits: number;
  ratio: number;
  level: PainLevel;
}

export interface AnalysisResponse extends ModelAnalysis {
  /** Older saved results predate this field; treat a missing kind as "face". */
  kind?: "face";
  /** Whether the photo shows a supported pet (cat or dog) with a readable face. */
  usable: boolean;
  /** Facial pain-sign score; cats only (dogs get observation-style health_signs). */
  catPain: PainSummary | null;
  model: string;
  createdAt: string;
}

const painUnitSchema = {
  type: "object",
  properties: {
    visible: { type: "boolean" },
    score: { type: "integer", enum: [0, 1, 2] },
    note: { type: "string" },
  },
  required: ["visible", "score", "note"],
  additionalProperties: false,
} as const;

export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    species: { type: "string", enum: [...SPECIES] },
    face_visible: { type: "boolean" },
    image_quality: { type: "string", enum: ["good", "fair", "poor"] },
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
    cues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          part: { type: "string", enum: [...CUE_PARTS] },
          observation: { type: "string" },
          meaning: { type: "string" },
        },
        required: ["part", "observation", "meaning"],
        additionalProperties: false,
      },
    },
    health_signs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area: { type: "string", enum: [...HEALTH_AREAS] },
          finding: { type: "string" },
          level: { type: "string", enum: ["ok", "watch", "concern"] },
        },
        required: ["area", "finding", "level"],
        additionalProperties: false,
      },
    },
    cat_pain_check: {
      type: "object",
      properties: {
        ear_position: painUnitSchema,
        orbital_tightening: painUnitSchema,
        muzzle_tension: painUnitSchema,
        whiskers_change: painUnitSchema,
        head_position: painUnitSchema,
        summary: { type: "string" },
      },
      required: [...CAT_PAIN_UNITS, "summary"],
      additionalProperties: false,
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
    "species",
    "face_visible",
    "image_quality",
    "mood",
    "cues",
    "health_signs",
    "cat_pain_check",
    "health_summary",
    "care_tips",
    "recommended_categories",
    "vet_advice",
  ],
  additionalProperties: false,
} as const;

/**
 * Sums the five feline facial pain-sign units that were actually visible.
 * Each unit is 0-2, so a fully visible face scores out of 10. The "high"
 * cut-off (ratio >= 0.4, i.e. 4/10) follows the published feline facial
 * pain-scale guidance for when a vet should consider pain relief; in this
 * app it is a screening hint for owners, never a diagnosis.
 */
export function summarizeCatPain(check: ModelAnalysis["cat_pain_check"]): PainSummary {
  let total = 0;
  let scoredUnits = 0;
  for (const unit of CAT_PAIN_UNITS) {
    const u = check[unit];
    if (!u.visible) continue;
    scoredUnits += 1;
    total += u.score;
  }
  const max = scoredUnits * 2;
  const ratio = max === 0 ? 0 : total / max;
  let level: PainLevel;
  if (scoredUnits < 3) level = "insufficient";
  else if (ratio >= 0.4) level = "high";
  else if (ratio >= 0.2) level = "mild";
  else level = "low";
  return { total, max, scoredUnits, ratio: Math.round(ratio * 100) / 100, level };
}
