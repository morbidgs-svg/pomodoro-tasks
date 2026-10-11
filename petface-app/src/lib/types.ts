// The server's schema module is the single source of truth for the analysis
// shape; it has no dependencies, so the app can import it directly.
import type { AnalysisResponse } from "../../server/src/schema";
import type { VoiceAnalysisResponse } from "../../server/src/voiceSchema";

export type {
  AnalysisResponse,
  Mood,
  ProductCategory,
  HealthArea,
  CuePart,
  PainLevel,
  CatPainUnit,
} from "../../server/src/schema";
export { CAT_PAIN_UNITS, PRODUCT_CATEGORIES } from "../../server/src/schema";
export type {
  VoiceAnalysisResponse,
  SoundContext,
  SoundType,
  Condition,
  Need,
} from "../../server/src/voiceSchema";
export { SOUND_CONTEXTS } from "../../server/src/voiceSchema";

export type AnyResult = AnalysisResponse | VoiceAnalysisResponse;

export function isVoice(r: AnyResult): r is VoiceAnalysisResponse {
  return r.kind === "voice";
}

export type PetSpecies = "cat" | "dog";

export interface Pet {
  id: string;
  name: string;
  species: PetSpecies;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  petId: string | null;
  /** Empty for sound analyses. */
  photoUri: string;
  result: AnyResult;
  /** Sound analyses only: 60 loudness bars (0-1) for drawing the clip. */
  envelope?: number[];
  createdAt: string;
}

export interface QuotaStatus {
  premium: boolean;
  used: number;
  limit: number;
  remaining: number;
  bonusAvailable: number;
}
