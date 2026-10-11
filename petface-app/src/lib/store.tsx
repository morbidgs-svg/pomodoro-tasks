import * as Crypto from "expo-crypto";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { FREE_LIMITS } from "./config";
import i18n, { deviceLanguage, type AppLanguage } from "./i18n";
import { hasPremium, initPurchases } from "./purchases";
import { deletePhoto, storage, type Settings } from "./storage";
import type { HistoryItem, Pet, PetSpecies, QuotaStatus } from "./types";

const PREMIUM_HISTORY_CAP = 1000;

interface AppState {
  ready: boolean;
  pets: Pet[];
  usablePets: Pet[];
  history: HistoryItem[];
  settings: Settings;
  quota: QuotaStatus | null;
  premium: boolean;
  selectedPet: Pet | null;
}

interface AppActions {
  addPet(name: string, species: PetSpecies): Promise<Pet>;
  updatePet(id: string, patch: Partial<Pick<Pet, "name" | "species">>): Promise<void>;
  deletePet(id: string): Promise<void>;
  selectPet(id: string): Promise<void>;
  setLanguage(lang: AppLanguage | null): Promise<void>;
  acceptDisclaimer(): Promise<void>;
  addHistory(item: HistoryItem): Promise<void>;
  deleteHistory(id: string): Promise<void>;
  clearAll(): Promise<void>;
  setQuota(q: QuotaStatus): void;
  refreshQuota(): Promise<void>;
  /** Re-reads the subscription from RevenueCat and tells the server to re-check. */
  refreshPremium(): Promise<void>;
}

const Ctx = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<Settings>({
    language: null,
    acceptedDisclaimer: false,
    selectedPetId: null,
  });
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [rcPremium, setRcPremium] = useState(false);

  const premium = rcPremium || !!quota?.premium;

  useEffect(() => {
    (async () => {
      const [p, h, s] = await Promise.all([
        storage.loadPets(),
        storage.loadHistory(),
        storage.loadSettings(),
      ]);
      setPets(p);
      setHistory(h);
      setSettings(s);
      if (s.language) await i18n.changeLanguage(s.language);
      setReady(true);
      await initPurchases();
      setRcPremium(await hasPremium());
      api.status().then(setQuota).catch(() => undefined);
    })();
  }, []);

  const saveSettings = useCallback(async (next: Settings) => {
    setSettings(next);
    await storage.saveSettings(next);
  }, []);

  const savePets = useCallback(async (next: Pet[]) => {
    setPets(next);
    await storage.savePets(next);
  }, []);

  const saveHistory = useCallback(async (next: HistoryItem[]) => {
    setHistory(next);
    await storage.saveHistory(next);
  }, []);

  // Stable identity: screens call this from focus effects.
  const refreshQuota = useCallback(async () => {
    try {
      setQuota(await api.status());
    } catch {
      // Offline or not configured - keep the last known quota.
    }
  }, []);

  // If a subscription lapses, extra pets stay saved but only the first is usable.
  const usablePets = premium ? pets : pets.slice(0, FREE_LIMITS.pets);
  const selectedPet =
    usablePets.find((p) => p.id === settings.selectedPetId) ?? usablePets[0] ?? null;

  const actions: AppActions = {
    async addPet(name, species) {
      const pet: Pet = {
        id: Crypto.randomUUID(),
        name: name.trim(),
        species,
        createdAt: new Date().toISOString(),
      };
      await savePets([...pets, pet]);
      await saveSettings({ ...settings, selectedPetId: pet.id });
      return pet;
    },
    async updatePet(id, patch) {
      await savePets(pets.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    async deletePet(id) {
      await savePets(pets.filter((p) => p.id !== id));
      if (settings.selectedPetId === id) await saveSettings({ ...settings, selectedPetId: null });
    },
    async selectPet(id) {
      await saveSettings({ ...settings, selectedPetId: id });
    },
    async setLanguage(lang) {
      await i18n.changeLanguage(lang ?? deviceLanguage());
      await saveSettings({ ...settings, language: lang });
    },
    async acceptDisclaimer() {
      await saveSettings({ ...settings, acceptedDisclaimer: true });
    },
    async addHistory(item) {
      const cap = premium ? PREMIUM_HISTORY_CAP : FREE_LIMITS.historyItems;
      const next = [item, ...history];
      next.slice(cap).forEach((old) => deletePhoto(old.photoUri));
      await saveHistory(next.slice(0, cap));
    },
    async deleteHistory(id) {
      const item = history.find((h) => h.id === id);
      if (item) deletePhoto(item.photoUri);
      await saveHistory(history.filter((h) => h.id !== id));
    },
    async clearAll() {
      history.forEach((h) => deletePhoto(h.photoUri));
      await Promise.all([saveHistory([]), savePets([])]);
      await saveSettings({ ...settings, selectedPetId: null });
    },
    setQuota,
    refreshQuota,
    async refreshPremium() {
      setRcPremium(await hasPremium());
      try {
        setQuota(await api.refreshPremium());
      } catch {
        // The server re-checks on the next analysis anyway.
      }
    },
  };

  const value = { ready, pets, usablePets, history, settings, quota, premium, selectedPet, ...actions };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
