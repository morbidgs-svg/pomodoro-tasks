// End-to-end check of the Worker: bundles src/index.ts, stubs only the Claude
// API with fetch, and drives /v1/analyze-voice and /v1/analyze.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

type Handler = { fetch(req: Request, env: Record<string, unknown>): Promise<Response> };
let worker: Handler;

before(() => {
  const out = join(mkdtempSync(join(tmpdir(), "petface-")), "worker.mjs");
  execFileSync("node_modules/.bin/esbuild", ["src/index.ts", "--bundle", "--format=esm", "--platform=node", `--outfile=${out}`, "--log-level=error"]);
  return import(pathToFileURL(out).href).then((m) => {
    worker = m.default;
  });
});

function fakeKV() {
  const m = new Map<string, string>();
  return {
    async get(k: string, t?: string) {
      const v = m.get(k);
      return v === undefined ? null : t === "json" ? JSON.parse(v) : v;
    },
    async put(k: string, v: string) { m.set(k, v); },
    async delete(k: string) { m.delete(k); },
  };
}

const DEV = "11111111-2222-3333-4444-555555555555";
const voiceResult = {
  source: "cat", sound_type: "meow",
  mood: { primary: "curious", confidence: "low", headline: "h", pet_voice: "v", explanation: "e" },
  arousal: "medium", condition: "normal", likely_needs: ["food", "food", "attention", "play", "rest"],
  cues: [{ cue: "pitch", observation: "o", meaning: "m" }],
  health_signs: [{ area: "voice_quality", finding: "f", level: "ok" }],
  health_summary: "s", care_tips: ["t"], recommended_categories: ["treat"], vet_advice: "none",
};

function stubClaude(answer: unknown, captured: Record<string, unknown>[]) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    assert.ok(url.includes("api.anthropic.com"), `unexpected fetch ${url}`);
    captured.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({
        id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5",
        content: [{ type: "text", text: JSON.stringify(answer) }],
        stop_reason: "end_turn", stop_sequence: null, stop_details: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
      { status: 200, headers: { "content-type": "application/json", "request-id": "req_1" } },
    );
  }) as typeof fetch;
}

const env = () => ({ QUOTA: fakeKV(), ANTHROPIC_API_KEY: "test", CLAUDE_MODEL_FREE: "claude-opus-5-5" });
const post = (path: string, body: unknown) =>
  new Request(`https://w.test${path}`, {
    method: "POST",
    headers: { "x-device-id": DEV, "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" },
    body: JSON.stringify(body),
  });

const spectrogram = { bands: 48, frames: 50, data: Buffer.alloc(48 * 50, 120).toString("base64") };

test("voice: valid clip reaches Claude with spectrogram image, schema and fallback", async () => {
  const calls: Record<string, unknown>[] = [];
  stubClaude(voiceResult, calls);
  const e = env();
  const res = await worker.fetch(
    post("/v1/analyze-voice", {
      locale: "ko", species: "cat", petName: "코코", context: "before_meal",
      features: { durationSec: 3, callCount: 2, f0MedianHz: 600, pitchContour: "rising", calls: [] },
      spectrogram,
    }),
    e,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { result: Record<string, unknown>; status: { used: number } };
  assert.equal(body.result.kind, "voice");
  assert.equal(body.result.usable, true);
  assert.deepEqual(body.result.likely_needs, ["food", "attention", "play"]);
  assert.equal(body.status.used, 1);

  const req = calls[0] as Record<string, any>;
  assert.equal(req.model, "claude-opus-5-5");
  assert.equal(req.fallbacks, "default");
  assert.equal(req.output_config.format.type, "json_schema");
  assert.equal(req.messages[0].content[0].source.media_type, "image/png");
  assert.match(req.messages[0].content[1].text, /Korean/);
  assert.match(req.messages[0].content[1].text, /before a meal/);
  assert.ok(!("thinking" in req), "Opus 5.5 must not send a thinking config");
});

test("voice: unrecognisable sound doesn't use the owner's quota", async () => {
  stubClaude({ ...voiceResult, source: "not_pet", sound_type: "unclear" }, []);
  const e = env();
  const res = await worker.fetch(
    post("/v1/analyze-voice", { locale: "en", features: { durationSec: 2 }, spectrogram }),
    e,
  );
  const body = (await res.json()) as { result: { usable: boolean; recommended_categories: unknown[] }; status: { used: number } };
  assert.equal(body.result.usable, false);
  assert.deepEqual(body.result.recommended_categories, []);
  assert.equal(body.status.used, 0);
});

test("voice: malformed payloads are rejected before calling Claude", async () => {
  const calls: Record<string, unknown>[] = [];
  stubClaude(voiceResult, calls);
  const bad = [
    { features: { durationSec: 2 }, spectrogram: { ...spectrogram, frames: 10 } },
    { features: { durationSec: 99 }, spectrogram },
    { features: null, spectrogram },
  ];
  for (const b of bad) {
    const res = await worker.fetch(post("/v1/analyze-voice", b), env());
    assert.equal(res.status, 400);
  }
  assert.equal(calls.length, 0);
});

test("face: photo analysis still works and is tagged as face", async () => {
  const face = {
    species: "dog", face_visible: true, image_quality: "good",
    mood: { primary: "happy", confidence: "medium", headline: "h", pet_voice: "v", explanation: "e" },
    cues: [], health_signs: [],
    cat_pain_check: Object.fromEntries(
      ["ear_position", "orbital_tightening", "muzzle_tension", "whiskers_change", "head_position"].map((k) => [k, { visible: false, score: 0, note: "" }]),
    ),
    health_summary: "", care_tips: [], recommended_categories: ["walk"], vet_advice: "none",
  };
  (face.cat_pain_check as Record<string, unknown>).summary = "";
  stubClaude(face, []);
  const res = await worker.fetch(
    post("/v1/analyze", { image: "aGVsbG8=", mediaType: "image/jpeg", locale: "ja" }),
    env(),
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { result: Record<string, unknown> };
  assert.equal(body.result.kind, "face");
  assert.equal(body.result.usable, true);
  assert.equal(body.result.catPain, null);
});
