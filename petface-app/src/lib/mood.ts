import type { Mood } from "./types";
import { colors } from "./theme";

export const MOOD_EMOJI: Record<Mood, string> = {
  relaxed: "😌",
  happy: "😊",
  curious: "🧐",
  playful: "😸",
  sleepy: "😴",
  alert: "👀",
  excited: "🤩",
  anxious: "😟",
  annoyed: "😾",
  fearful: "😨",
  uncomfortable: "🤕",
};

const POSITIVE: Mood[] = ["relaxed", "happy", "curious", "playful", "sleepy", "excited"];

export function moodColor(mood: Mood): string {
  if (POSITIVE.includes(mood)) return colors.ok;
  if (mood === "alert") return colors.accent;
  return colors.watch;
}

export const LEVEL_COLORS = {
  ok: { fg: colors.ok, bg: colors.okSoft },
  watch: { fg: colors.watch, bg: colors.watchSoft },
  concern: { fg: colors.concern, bg: colors.concernSoft },
} as const;

export const VET_LEVEL = { none: "ok", monitor: "watch", consult: "concern" } as const;
