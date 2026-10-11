import { analyzePetPhoto, AnalysisError, modelFor, type ClaudeEnv, type ImageMediaType } from "./analyze";
import { checkQuota, getStatus, grantAdBonus, recordUse, type QuotaEnv } from "./quota";
import { clearPremiumCache, isPremium, type RevenueCatEnv } from "./revenuecat";

export interface Env extends ClaudeEnv, QuotaEnv, RevenueCatEnv {
  QUOTA: KVNamespace;
  /** Optional shared key the app sends in `x-app-key`; blocks casual scripted use. */
  APP_KEY?: string;
}

const MEDIA_TYPES = new Set<ImageMediaType>(["image/jpeg", "image/png", "image/webp"]);
const LOCALES = new Set(["ko", "en", "ja"]);
// ~1.5 MB of base64 (~1.1 MB image). The app resizes to 1024px JPEG first.
const MAX_IMAGE_BASE64 = 1_500_000;
const DEVICE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function error(code: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ error: code, ...extra }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") return json({ ok: true });

    if (env.APP_KEY && request.headers.get("x-app-key") !== env.APP_KEY) {
      return error("unauthorized", 401);
    }
    const deviceId = request.headers.get("x-device-id") ?? "";
    if (!DEVICE_ID_RE.test(deviceId)) return error("bad_device_id", 400);
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

    try {
      if (request.method === "GET" && url.pathname === "/v1/status") {
        const premium = await isPremium(env, deviceId);
        return json(await getStatus(env, deviceId, premium));
      }

      if (request.method === "POST" && url.pathname === "/v1/refresh-premium") {
        await clearPremiumCache(env, deviceId);
        const premium = await isPremium(env, deviceId);
        return json(await getStatus(env, deviceId, premium));
      }

      if (request.method === "POST" && url.pathname === "/v1/ad-bonus") {
        if (await isPremium(env, deviceId)) return json(await getStatus(env, deviceId, true));
        return json(await grantAdBonus(env, deviceId));
      }

      if (request.method === "POST" && url.pathname === "/v1/analyze") {
        return await handleAnalyze(request, env, deviceId, ip);
      }
    } catch (e) {
      console.error("Unhandled error", e);
      return error("server_error", 500);
    }

    return error("not_found", 404);
  },
} satisfies ExportedHandler<Env>;

async function handleAnalyze(
  request: Request,
  env: Env,
  deviceId: string,
  ip: string,
): Promise<Response> {
  let body: {
    image?: unknown;
    mediaType?: unknown;
    locale?: unknown;
    petName?: unknown;
    species?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return error("bad_request", 400);
  }
  const image = typeof body.image === "string" ? body.image : "";
  const mediaType = body.mediaType as ImageMediaType;
  const locale = typeof body.locale === "string" && LOCALES.has(body.locale) ? body.locale : "en";
  const pet = {
    name: typeof body.petName === "string" ? body.petName : undefined,
    species: body.species === "cat" || body.species === "dog" ? body.species : undefined,
  } as const;

  if (!image || image.length > MAX_IMAGE_BASE64) return error("bad_image", 400);
  if (!MEDIA_TYPES.has(mediaType)) return error("bad_image", 400);

  const premium = await isPremium(env, deviceId);
  const quota = await checkQuota(env, deviceId, ip, premium);
  if (!quota.ok) return error(quota.reason, 429, { status: quota.status });

  try {
    const result = await analyzePetPhoto(env, {
      imageBase64: image,
      mediaType,
      locale,
      pet,
      model: modelFor(env, premium),
    });
    await recordUse(env, deviceId, ip, result.usable);
    const status = await getStatus(env, deviceId, premium);
    return json({ result, status });
  } catch (e) {
    if (e instanceof AnalysisError) {
      const http = e.code === "upstream_busy" ? 503 : e.code === "refused" ? 422 : 502;
      return error(e.code, http);
    }
    throw e;
  }
}
