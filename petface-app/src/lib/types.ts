// The server's schema module is the single source of truth for the analysis
// shape; it has no dependencies, so the app can import it directly.
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

import type { AnalysisResponse } from "../../server/src/schema";

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
  photoUri: string;
  result: AnalysisResponse;
  createdAt: string;
}

export interface QuotaStatus {
  premium: boolean;
  used: number;
  limit: number;
  remaining: number;
  bonusAvailable: number;
}
