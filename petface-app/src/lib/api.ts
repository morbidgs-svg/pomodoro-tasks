import { config } from "./config";
import { demoAnalysis, demoEnabled } from "./demo";
import { getDeviceId } from "./device";
import type { AnalysisResponse, PetSpecies, QuotaStatus } from "./types";

export type ApiErrorCode =
  | "not_configured"
  | "network"
  | "device_limit"
  | "ip_limit"
  | "service_busy"
  | "upstream_busy"
  | "refused"
  | "bad_image"
  | "server_error";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public status?: QuotaStatus,
  ) {
    super(code);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!config.apiUrl) throw new ApiError("not_configured");
  const deviceId = await getDeviceId();
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-device-id": deviceId,
        ...(config.appKey ? { "x-app-key": config.appKey } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError("network");
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = typeof body.error === "string" ? body.error : "server_error";
    const known: ApiErrorCode[] = [
      "device_limit",
      "ip_limit",
      "service_busy",
      "upstream_busy",
      "refused",
      "bad_image",
    ];
    throw new ApiError(
      known.includes(code as ApiErrorCode) ? (code as ApiErrorCode) : "server_error",
      body.status as QuotaStatus | undefined,
    );
  }
  return body as T;
}

const DEMO_STATUS: QuotaStatus = { premium: false, used: 0, limit: 3, remaining: 3, bonusAvailable: 2 };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const api = {
  status: () =>
    demoEnabled(config.apiUrl) ? Promise.resolve(DEMO_STATUS) : request<QuotaStatus>("/v1/status"),
  refreshPremium: () => request<QuotaStatus>("/v1/refresh-premium", { method: "POST" }),
  claimAdBonus: () => request<QuotaStatus>("/v1/ad-bonus", { method: "POST" }),
  analyze: (input: {
    image: string;
    locale: string;
    petName?: string;
    species?: PetSpecies;
  }) =>
    demoEnabled(config.apiUrl)
      ? wait(2500).then(() => ({ result: demoAnalysis(input.locale, input.species), status: DEMO_STATUS }))
      : request<{ result: AnalysisResponse; status: QuotaStatus }>("/v1/analyze", {
      method: "POST",
      body: JSON.stringify({ ...input, mediaType: "image/jpeg" }),
    }),
};
