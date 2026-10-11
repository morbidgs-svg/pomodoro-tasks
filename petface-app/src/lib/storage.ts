import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
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

function photoDir(): Directory {
  const dir = new Directory(Paths.document, "photos");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Copies a (cache) photo into permanent storage and returns its new URI. */
export async function persistPhoto(tempUri: string, id: string): Promise<string> {
  const dest = new File(photoDir(), `${id}.jpg`);
  if (dest.exists) dest.delete();
  await new File(tempUri).copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Missing files are fine - the record is going away anyway.
  }
}
