import type { HistoryItem } from "./types";

// Results that aren't worth keeping in history (no readable pet face) are
// shown once from memory instead of being saved.
const transient = new Map<string, HistoryItem>();

export const session = {
  put(item: HistoryItem) {
    transient.set(item.id, item);
  },
  get(id: string): HistoryItem | undefined {
    return transient.get(id);
  },
};
