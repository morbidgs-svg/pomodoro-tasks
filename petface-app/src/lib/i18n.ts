import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import ko from "@/locales/ko";
import en from "@/locales/en";
import ja from "@/locales/ja";

export type AppLanguage = "ko" | "en" | "ja";
export const LANGUAGES: AppLanguage[] = ["ko", "en", "ja"];
export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

export function deviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode ?? "en";
  return (LANGUAGES as string[]).includes(code) ? (code as AppLanguage) : "en";
}

// Configures i18next's shared default instance, which react-i18next reads.
// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en }, ja: { translation: ja } },
  lng: deviceLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function currentLanguage(): AppLanguage {
  const lng = i18n.language as AppLanguage;
  return LANGUAGES.includes(lng) ? lng : "en";
}

export default i18n;
