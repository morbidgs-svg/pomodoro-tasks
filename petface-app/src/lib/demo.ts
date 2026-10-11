import type { AnalysisResponse, PetSpecies } from "./types";

// Canned results used only in development builds when no server URL is set,
// so the whole flow can be tried without an API key. Never used in release.

export const demoEnabled = (apiUrl: string) => __DEV__ && !apiUrl;

const text = {
  ko: {
    cat: {
      headline: "햇살 아래 세상 평화로운 중",
      voice: "지금 이 자리, 아무도 건드리지 마라옹",
      explanation:
        "귀가 앞을 향해 서 있고 눈이 반쯤 감겨 있어 편안한 상태로 보여요. 수염도 힘이 빠져 자연스럽게 뻗어 있어요.",
      cues: [
        ["ears", "귀가 앞쪽을 향해 곧게 서 있어요", "주변이 안전하다고 느낄 때의 귀 모양이에요"],
        ["eyes", "눈을 반쯤 감고 있어요", "신뢰하고 긴장이 풀렸을 때 자주 보여요"],
        ["whiskers", "수염이 옆으로 느슨하게 퍼져 있어요", "차분한 상태의 신호예요"],
      ],
      health: [
        ["eyes", "눈곱이나 충혈은 보이지 않아요", "ok"],
        ["nose", "코 주변이 깨끗해요", "ok"],
        ["face_tension", "표정 근육이 이완되어 있어요", "ok"],
      ],
      healthSummary: "사진에서 눈에 띄는 이상 신호는 보이지 않아요.",
      tips: ["낚싯대 장난감으로 하루 10분씩 사냥 놀이를 해 주세요", "햇볕 드는 창가 자리를 그대로 두면 좋아요"],
    },
    dog: {
      headline: "산책 가자는 말만 기다리는 중!",
      voice: "방금 '산책'이라고 했어? 했지? 😆",
      explanation:
        "입이 살짝 벌어져 혀가 편하게 나와 있고 눈매가 부드러워요. 기분 좋고 들뜬 상태로 보여요.",
      cues: [
        ["mouth", "입을 살짝 벌리고 혀가 나와 있어요", "편안하고 기분 좋을 때의 표정이에요"],
        ["eyes", "눈매가 부드럽고 흰자가 거의 보이지 않아요", "긴장하지 않은 상태예요"],
        ["ears", "귀가 자연스러운 위치에 있어요", "주변에 경계할 것이 없다는 뜻이에요"],
      ],
      health: [
        ["eyes", "눈 주변이 깨끗해요", "ok"],
        ["mouth_teeth", "앞니 쪽에 약간의 치석이 보이는 것 같아요", "watch"],
        ["skin_coat", "털 상태가 고르고 윤기 있어 보여요", "ok"],
      ],
      healthSummary: "전반적으로 건강해 보이지만, 이빨 상태는 한번 살펴봐 주세요.",
      tips: ["양치나 덴탈 껌으로 치석 관리를 시작해 보세요", "오늘은 평소보다 10분 더 산책해 주세요"],
    },
  },
  en: {
    cat: {
      headline: "Peak sunbeam serenity",
      voice: "This spot is mine. Do not disturb.",
      explanation:
        "Ears are upright and facing forward and the eyes are half-closed, which usually means a relaxed cat. Whiskers are loose and natural.",
      cues: [
        ["ears", "Ears upright, facing forward", "Typical when a cat feels safe"],
        ["eyes", "Eyes half-closed", "Often seen when a cat is trusting and relaxed"],
        ["whiskers", "Whiskers loose and slightly sideways", "A calm signal"],
      ],
      health: [
        ["eyes", "No discharge or redness visible", "ok"],
        ["nose", "Nose looks clean", "ok"],
        ["face_tension", "Facial muscles look relaxed", "ok"],
      ],
      healthSummary: "No obvious warning signs in this photo.",
      tips: ["Play 10 minutes of wand-toy 'hunting' each day", "Keep that sunny window spot available"],
    },
    dog: {
      headline: "Waiting for the W-word!",
      voice: "Did you say 'walk'? You did, right?",
      explanation:
        "Mouth slightly open with a loose tongue and soft eyes - this looks like a happy, excited dog.",
      cues: [
        ["mouth", "Mouth slightly open, tongue out", "A relaxed, happy expression"],
        ["eyes", "Soft eyes, little white showing", "Not tense"],
        ["ears", "Ears in a natural position", "Nothing to be wary of"],
      ],
      health: [
        ["eyes", "Eyes look clean", "ok"],
        ["mouth_teeth", "Possible light tartar on the front teeth", "watch"],
        ["skin_coat", "Coat looks even and glossy", "ok"],
      ],
      healthSummary: "Looks healthy overall; keep an eye on the teeth.",
      tips: ["Start brushing or dental chews to manage tartar", "Add 10 extra minutes to today's walk"],
    },
  },
} as const;

export function demoAnalysis(locale: string, species: PetSpecies = "cat"): AnalysisResponse {
  const lang = locale === "ko" ? "ko" : "en";
  const s = text[lang][species];
  const unit = (score: 0 | 1 | 2) => ({ visible: species === "cat", score, note: "" });
  return {
    species,
    face_visible: true,
    image_quality: "good",
    mood: {
      primary: species === "cat" ? "relaxed" : "excited",
      confidence: "medium",
      headline: s.headline,
      pet_voice: s.voice,
      explanation: s.explanation,
    },
    cues: s.cues.map(([part, observation, meaning]) => ({ part, observation, meaning })),
    health_signs: s.health.map(([area, finding, level]) => ({ area, finding, level })),
    cat_pain_check: {
      ear_position: unit(0),
      orbital_tightening: { ...unit(1), visible: false },
      muzzle_tension: unit(0),
      whiskers_change: unit(0),
      head_position: unit(0),
      summary: "",
    },
    health_summary: s.healthSummary,
    care_tips: [...s.tips],
    recommended_categories: species === "cat" ? ["toy", "bed"] : ["dental", "walk"],
    vet_advice: species === "cat" ? "none" : "monitor",
    usable: true,
    catPain:
      species === "cat" ? { total: 0, max: 8, scoredUnits: 4, ratio: 0, level: "low" } : null,
    model: "demo",
    createdAt: new Date().toISOString(),
  };
}
