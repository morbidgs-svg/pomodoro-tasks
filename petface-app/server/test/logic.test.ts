import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeCatPain, type ModelAnalysis } from "../src/schema.ts";
import { checkQuota, getStatus, grantAdBonus, recordUse, type QuotaEnv } from "../src/quota.ts";

function painCheck(scores: (number | null)[]): ModelAnalysis["cat_pain_check"] {
  const units = ["ear_position", "orbital_tightening", "muzzle_tension", "whiskers_change", "head_position"] as const;
  const out = { summary: "" } as ModelAnalysis["cat_pain_check"];
  units.forEach((u, i) => {
    const s = scores[i];
    out[u] = { visible: s !== null, score: (s ?? 0) as 0 | 1 | 2, note: "" };
  });
  return out;
}

test("cat pain: all relaxed is low", () => {
  assert.deepEqual(summarizeCatPain(painCheck([0, 0, 0, 0, 0])), {
    total: 0, max: 10, scoredUnits: 5, ratio: 0, level: "low",
  });
});

test("cat pain: 4/10 reaches the high band", () => {
  const r = summarizeCatPain(painCheck([1, 1, 1, 1, 0]));
  assert.equal(r.total, 4);
  assert.equal(r.level, "high");
});

test("cat pain: 2/10 is mild, 1/10 is low", () => {
  assert.equal(summarizeCatPain(painCheck([1, 1, 0, 0, 0])).level, "mild");
  assert.equal(summarizeCatPain(painCheck([1, 0, 0, 0, 0])).level, "low");
});

test("cat pain: hidden units are excluded, under 3 visible is insufficient", () => {
  const r = summarizeCatPain(painCheck([2, null, 1, null, 1]));
  assert.equal(r.max, 6);
  assert.equal(r.total, 4);
  assert.equal(r.level, "high");
  assert.equal(summarizeCatPain(painCheck([2, null, null, null, 2])).level, "insufficient");
});

function fakeKV(): KVNamespace {
  const m = new Map<string, string>();
  return {
    async get(key: string, type?: string) {
      const v = m.get(key);
      if (v === undefined) return null;
      return type === "json" ? JSON.parse(v) : v;
    },
    async put(key: string, value: string) { m.set(key, value); },
    async delete(key: string) { m.delete(key); },
  } as unknown as KVNamespace;
}

const DEV = "11111111-2222-3333-4444-555555555555";

test("quota: free users get 3/day, unusable photos don't count", async () => {
  const env: QuotaEnv = { QUOTA: fakeKV() };
  await recordUse(env, DEV, "1.1.1.1", false);
  assert.equal((await getStatus(env, DEV, false)).remaining, 3);
  for (let i = 0; i < 3; i++) {
    assert.equal((await checkQuota(env, DEV, "1.1.1.1", false)).ok, true);
    await recordUse(env, DEV, "1.1.1.1", true);
  }
  const blocked = await checkQuota(env, DEV, "1.1.1.1", false);
  assert.equal(blocked.ok, false);
  assert.equal(!blocked.ok && blocked.reason, "device_limit");
});

test("quota: rewarded-ad bonus adds one each, capped at AD_BONUS_MAX", async () => {
  const env: QuotaEnv = { QUOTA: fakeKV(), AD_BONUS_MAX: "2" };
  for (let i = 0; i < 3; i++) await recordUse(env, DEV, "1.1.1.1", true);
  assert.equal((await grantAdBonus(env, DEV)).remaining, 1);
  assert.equal((await grantAdBonus(env, DEV)).remaining, 2);
  const third = await grantAdBonus(env, DEV);
  assert.equal(third.remaining, 2);
  assert.equal(third.bonusAvailable, 0);
});

test("quota: premium uses its own daily cap and ignores the IP cap", async () => {
  const env: QuotaEnv = { QUOTA: fakeKV(), PREMIUM_DAILY_LIMIT: "30", IP_DAILY_LIMIT: "1" };
  await recordUse(env, DEV, "9.9.9.9", true);
  assert.equal((await checkQuota(env, DEV, "9.9.9.9", true)).ok, true);
  const other = "aaaaaaaa-2222-3333-4444-555555555555";
  const free = await checkQuota(env, other, "9.9.9.9", false);
  assert.equal(!free.ok && free.reason, "ip_limit");
});

test("quota: global cap stops everyone", async () => {
  const env: QuotaEnv = { QUOTA: fakeKV(), GLOBAL_DAILY_LIMIT: "1" };
  await recordUse(env, DEV, "1.1.1.1", true);
  const r = await checkQuota(env, "bbbbbbbb-2222-3333-4444-555555555555", "2.2.2.2", true);
  assert.equal(!r.ok && r.reason, "service_busy");
});
