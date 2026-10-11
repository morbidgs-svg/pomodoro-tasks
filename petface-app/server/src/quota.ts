// Daily usage limits kept in Workers KV. KV is eventually consistent, so the
// counts are a soft limit (a burst of parallel requests can slip slightly
// past it) - good enough to bound API spend, not a billing ledger.

export interface QuotaEnv {
  QUOTA: KVNamespace;
  FREE_DAILY_LIMIT?: string;
  PREMIUM_DAILY_LIMIT?: string;
  AD_BONUS_MAX?: string;
  IP_DAILY_LIMIT?: string;
  GLOBAL_DAILY_LIMIT?: string;
}

interface DeviceDay {
  used: number;
  bonus: number;
}

const DAY_TTL_SECONDS = 60 * 60 * 48;

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

async function readDevice(env: QuotaEnv, deviceId: string, day: string): Promise<DeviceDay> {
  const raw = await env.QUOTA.get(`dev:${deviceId}:${day}`, "json");
  const v = (raw ?? {}) as Partial<DeviceDay>;
  return { used: v.used ?? 0, bonus: v.bonus ?? 0 };
}

async function readCounter(env: QuotaEnv, key: string): Promise<number> {
  return Number((await env.QUOTA.get(key)) ?? 0);
}

export interface QuotaStatus {
  premium: boolean;
  used: number;
  limit: number;
  remaining: number;
  bonusAvailable: number;
}

export async function getStatus(
  env: QuotaEnv,
  deviceId: string,
  premium: boolean,
): Promise<QuotaStatus> {
  const day = today();
  const d = await readDevice(env, deviceId, day);
  const base = premium
    ? num(env.PREMIUM_DAILY_LIMIT, 30)
    : num(env.FREE_DAILY_LIMIT, 3);
  const limit = base + (premium ? 0 : d.bonus);
  const bonusMax = num(env.AD_BONUS_MAX, 2);
  return {
    premium,
    used: d.used,
    limit,
    remaining: Math.max(0, limit - d.used),
    bonusAvailable: premium ? 0 : Math.max(0, bonusMax - d.bonus),
  };
}

export type QuotaCheck =
  | { ok: true; status: QuotaStatus }
  | { ok: false; reason: "device_limit" | "ip_limit" | "service_busy"; status: QuotaStatus };

export async function checkQuota(
  env: QuotaEnv,
  deviceId: string,
  ip: string,
  premium: boolean,
): Promise<QuotaCheck> {
  const day = today();
  const status = await getStatus(env, deviceId, premium);
  if (status.remaining <= 0) return { ok: false, reason: "device_limit", status };

  const ipCount = await readCounter(env, `ip:${ip}:${day}`);
  if (!premium && ipCount >= num(env.IP_DAILY_LIMIT, 20)) {
    return { ok: false, reason: "ip_limit", status };
  }
  const global = await readCounter(env, `global:${day}`);
  if (global >= num(env.GLOBAL_DAILY_LIMIT, 5000)) {
    return { ok: false, reason: "service_busy", status };
  }
  return { ok: true, status };
}

/**
 * Called only after Claude answered, so failed calls don't use up quota.
 * Photos with no readable dog or cat face don't count against the owner's daily
 * analyses, but still count toward the IP and global caps that bound spend.
 */
export async function recordUse(
  env: QuotaEnv,
  deviceId: string,
  ip: string,
  countDevice: boolean,
): Promise<void> {
  const day = today();
  const d = await readDevice(env, deviceId, day);
  const ipCount = await readCounter(env, `ip:${ip}:${day}`);
  const global = await readCounter(env, `global:${day}`);
  await Promise.all([
    countDevice
      ? env.QUOTA.put(`dev:${deviceId}:${day}`, JSON.stringify({ ...d, used: d.used + 1 }), {
          expirationTtl: DAY_TTL_SECONDS,
        })
      : Promise.resolve(),
    env.QUOTA.put(`ip:${ip}:${day}`, String(ipCount + 1), { expirationTtl: DAY_TTL_SECONDS }),
    env.QUOTA.put(`global:${day}`, String(global + 1), { expirationTtl: DAY_TTL_SECONDS }),
  ]);
}

/**
 * Grants one extra free analysis after the app reports a completed rewarded
 * ad. The server can't see the ad itself, so this is capped per day
 * (AD_BONUS_MAX) to bound what a tampered client could claim.
 */
export async function grantAdBonus(env: QuotaEnv, deviceId: string): Promise<QuotaStatus> {
  const day = today();
  const d = await readDevice(env, deviceId, day);
  if (d.bonus < num(env.AD_BONUS_MAX, 2)) {
    await env.QUOTA.put(
      `dev:${deviceId}:${day}`,
      JSON.stringify({ ...d, bonus: d.bonus + 1 }),
      { expirationTtl: DAY_TTL_SECONDS },
    );
  }
  return getStatus(env, deviceId, false);
}
