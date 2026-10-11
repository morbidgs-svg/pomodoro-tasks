import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSIS_JSON_SCHEMA,
  summarizeCatPain,
  type AnalysisResponse,
  type ModelAnalysis,
} from "./schema";
import { DEFAULT_FALLBACK_MODELS, type ClaudeEnv } from "./models";
import { SYSTEM_PROMPT, userInstruction } from "./prompt";

export type { ClaudeEnv } from "./models";
export { modelFor } from "./models";

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export class AnalysisError extends Error {
  constructor(
    public code: "refused" | "truncated" | "invalid_output" | "upstream_busy" | "upstream_error",
    message: string,
  ) {
    super(message);
  }
}

export async function analyzePetPhoto(
  env: ClaudeEnv,
  input: {
    imageBase64: string;
    mediaType: ImageMediaType;
    locale: string;
    pet?: { name?: string; species?: "cat" | "dog" };
    model: string;
  },
): Promise<AnalysisResponse> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60_000 });
  const model = input.model;
  const useFallback = DEFAULT_FALLBACK_MODELS.has(model);

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model,
      max_tokens: 8000,
      ...(useFallback
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
      system: SYSTEM_PROMPT,
      output_config: {
        effort: env.CLAUDE_EFFORT ?? "low",
        format: { type: "json_schema", schema: ANALYSIS_JSON_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 },
            },
            { type: "text", text: userInstruction(input.locale, input.pet) },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
      throw new AnalysisError("upstream_busy", error.message);
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Claude API error", error.status, error.message);
      throw new AnalysisError("upstream_error", error.message);
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new AnalysisError("refused", response.stop_details?.explanation ?? "refused");
  }
  if (response.stop_reason === "max_tokens") {
    throw new AnalysisError("truncated", "analysis output was cut off");
  }

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let parsed: ModelAnalysis;
  try {
    parsed = JSON.parse(text) as ModelAnalysis;
  } catch {
    throw new AnalysisError("invalid_output", "analysis was not valid JSON");
  }

  const usable = (parsed.species === "cat" || parsed.species === "dog") && parsed.face_visible;
  return {
    ...parsed,
    cues: parsed.cues.slice(0, 6),
    health_signs: parsed.health_signs.slice(0, 6),
    care_tips: parsed.care_tips.slice(0, 4),
    recommended_categories: usable
      ? [...new Set(parsed.recommended_categories)].slice(0, 3)
      : [],
    usable,
    catPain: usable && parsed.species === "cat" ? summarizeCatPain(parsed.cat_pain_check) : null,
    model: response.model,
    createdAt: new Date().toISOString(),
  };
}
