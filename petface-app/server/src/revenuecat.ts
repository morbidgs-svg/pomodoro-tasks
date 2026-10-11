// Checks a subscriber's entitlement with the RevenueCat REST API so premium
// status can't be faked by the app. Results are cached briefly in KV.

export interface RevenueCatEnv {
  QUOTA: KVNamespace;
  REVENUECAT_SECRET_KEY?: string;
  PREMIUM_ENTITLEMENT_ID?: string;
}

interface SubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, { expires_date: string | null }>;
  };
}

const CACHE_TTL_SECONDS = 300;

export async function isPremium(env: RevenueCatEnv, appUserId: string): Promise<boolean> {
  if (!env.REVENUECAT_SECRET_KEY) return false;

  const cacheKey = `rc:${appUserId}`;
  const cached = await env.QUOTA.get(cacheKey);
  if (cached !== null) return cached === "1";

  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` } },
  );
  if (!res.ok) {
    // Don't cache failures: a RevenueCat outage shouldn't lock paying users
    // out for five minutes after it recovers.
    console.error("RevenueCat lookup failed", res.status);
    return false;
  }
  const body = (await res.json()) as SubscriberResponse;
  const entitlementId = env.PREMIUM_ENTITLEMENT_ID ?? "premium";
  const ent = body.subscriber?.entitlements?.[entitlementId];
  const active = !!ent && (ent.expires_date === null || Date.parse(ent.expires_date) > Date.now());

  try {
    await env.QUOTA.put(cacheKey, active ? "1" : "0", { expirationTtl: CACHE_TTL_SECONDS });
  } catch (e) {
    console.error("premium cache write failed", e);
  }
  return active;
}

/** Lets the app force a fresh check right after a purchase or restore. */
export async function clearPremiumCache(env: RevenueCatEnv, appUserId: string): Promise<void> {
  await env.QUOTA.delete(`rc:${appUserId}`);
}
