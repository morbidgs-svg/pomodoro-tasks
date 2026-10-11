// Model selection, kept free of imports so it can be unit-tested directly.

export interface ClaudeEnv {
  ANTHROPIC_API_KEY: string;
  /** Model for free users; falls back to CLAUDE_MODEL, then DEFAULT_MODEL. */
  CLAUDE_MODEL_FREE?: string;
  /** Model for Premium subscribers; falls back to CLAUDE_MODEL, then DEFAULT_MODEL. */
  CLAUDE_MODEL_PREMIUM?: string;
  CLAUDE_MODEL?: string;
  CLAUDE_EFFORT?: "low" | "medium" | "high";
}

export function modelFor(env: ClaudeEnv, premium: boolean): string {
  const tier = premium ? env.CLAUDE_MODEL_PREMIUM : env.CLAUDE_MODEL_FREE;
  return tier || env.CLAUDE_MODEL || DEFAULT_MODEL;
}

export const DEFAULT_MODEL = "claude-opus-5-5";

// Models that accept the server-side `fallbacks: "default"` refusal fallback.
export const DEFAULT_FALLBACK_MODELS = new Set([
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-fable-5-1",
  "claude-sonnet-5-5",
]);
