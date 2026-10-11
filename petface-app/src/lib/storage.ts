import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HistoryItem, Pet } from "./types";

// Everything stays on the device: photos in the app's document folder,
// pets and results in AsyncStorage. Nothing is stored on the server.

const PETS_KEY = "petface.pets.v1";
const HISTORY_KEY = "petface.history.v1";
const SETTINGS_KEY = "petface.settings.v1";

export interface Settings {
  language: "ko" | "en" | "ja" | null;
  acceptedDisclaimer: boolean;
  selectedPetId: string | null;
}

const DEFAULT_SETTINGS: Settings = {
  language: null,
  acceptedDisclaimer: false,
  selectedPetId: null,
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const storage = {
  loadPets: () => readJson<Pet[]>(PETS_KEY, []),
  savePets: (pets: Pet[]) => AsyncStorage.setItem(PETS_KEY, JSON.stringify(pets)),

  loadHistory: () => readJson<HistoryItem[]>(HISTORY_KEY, []),
  saveHistory: (items: HistoryItem[]) => AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items)),

  async loadSettings(): Promise<Settings> {
    return { ...DEFAULT_SETTINGS, ...(await readJson<Partial<Settings>>(SETTINGS_KEY, {})) };
  },
  saveSettings: (s: Settings) => AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)),
};
