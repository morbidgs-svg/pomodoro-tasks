import type { PetSpecies, ProductCategory } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Product recommendations shown on the result screen and the "Picks" tab.
//
// HOW TO FILL THIS IN (no coding needed beyond editing text):
//  1. For each product, paste the product page URL into `url`.
//     - Your own store: source "myshop" (shown with an "Official store" badge, listed first).
//     - Coupang Partners / other affiliate links: source "affiliate"
//       (the affiliate disclosure line is shown automatically).
//  2. Pick the categories it suits (see ProductCategory) and which pets it is for.
//  3. Products with an empty `url` are hidden in release builds and shown with a
//     "SAMPLE" tag in development builds, so you can see the layout first.
// ─────────────────────────────────────────────────────────────────────────────

type Localized = { ko: string; en: string; ja: string };

export interface Product {
  id: string;
  title: Localized;
  url: string;
  imageUrl?: string;
  priceText?: Partial<Localized>;
  source: "myshop" | "affiliate";
  species: PetSpecies[];
  categories: ProductCategory[];
}

export const PRODUCTS: Product[] = [
  {
    id: "sample-cat-wand",
    title: { ko: "깃털 낚싯대 장난감", en: "Feather wand toy", ja: "羽根つき猫じゃらし" },
    url: "",
    source: "myshop",
    species: ["cat"],
    categories: ["toy"],
  },
  {
    id: "sample-cat-scratcher",
    title: { ko: "골판지 스크래쳐", en: "Cardboard scratcher", ja: "段ボール爪とぎ" },
    url: "",
    source: "myshop",
    species: ["cat"],
    categories: ["scratcher", "calming"],
  },
  {
    id: "sample-dog-chew",
    title: { ko: "천연 우드 츄 장난감", en: "Natural wood chew", ja: "天然ウッドチュー" },
    url: "",
    source: "affiliate",
    species: ["dog"],
    categories: ["chew", "dental"],
  },
  {
    id: "sample-dog-snuffle",
    title: { ko: "노즈워크 매트", en: "Snuffle mat", ja: "ノーズワークマット" },
    url: "",
    source: "myshop",
    species: ["dog"],
    categories: ["toy", "calming"],
  },
  {
    id: "sample-fountain",
    title: { ko: "저소음 정수기 급수기", en: "Quiet water fountain", ja: "静音給水器" },
    url: "",
    source: "affiliate",
    species: ["cat", "dog"],
    categories: ["water"],
  },
  {
    id: "sample-donut-bed",
    title: { ko: "도넛 쿠션 방석", en: "Donut calming bed", ja: "ドーナツクッションベッド" },
    url: "",
    source: "myshop",
    species: ["cat", "dog"],
    categories: ["bed", "calming"],
  },
  {
    id: "sample-eye-wipes",
    title: { ko: "눈물 자국 클리너", en: "Gentle eye wipes", ja: "目元ケアシート" },
    url: "",
    source: "affiliate",
    species: ["cat", "dog"],
    categories: ["grooming", "health_check"],
  },
  {
    id: "sample-dental",
    title: { ko: "덴탈 칫솔·치약 세트", en: "Dental brush kit", ja: "デンタルケアセット" },
    url: "",
    source: "affiliate",
    species: ["cat", "dog"],
    categories: ["dental"],
  },
  {
    id: "sample-treat",
    title: { ko: "동결건조 트릿", en: "Freeze-dried treats", ja: "フリーズドライおやつ" },
    url: "",
    source: "myshop",
    species: ["cat", "dog"],
    categories: ["treat"],
  },
  {
    id: "sample-harness",
    title: { ko: "편안한 산책 하네스", en: "Comfort walking harness", ja: "お散歩ハーネス" },
    url: "",
    source: "myshop",
    species: ["dog"],
    categories: ["walk"],
  },
];

export function visibleProducts(): (Product & { sample: boolean })[] {
  return PRODUCTS.map((p) => ({ ...p, sample: !p.url })).filter((p) => !p.sample || __DEV__);
}

/** Products for a result: matching category and species, own store first. */
export function recommendProducts(
  categories: ProductCategory[],
  species: PetSpecies | null,
  limit = 4,
): (Product & { sample: boolean })[] {
  const list = visibleProducts().filter(
    (p) => (!species || p.species.includes(species)) && p.categories.some((c) => categories.includes(c)),
  );
  const rank = (p: Product) => {
    const catIdx = Math.min(...p.categories.map((c) => categories.indexOf(c)).filter((i) => i >= 0));
    return catIdx * 2 + (p.source === "myshop" ? 0 : 1);
  };
  return list.sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}
