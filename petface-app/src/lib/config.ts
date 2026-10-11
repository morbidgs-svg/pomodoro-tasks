import { Platform } from "react-native";

// All values come from EXPO_PUBLIC_* variables (see .env.example). They are
// baked into the app bundle, so never put server secrets here.
const env = process.env;

export const config = {
  apiUrl: (env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, ""),
  appKey: env.EXPO_PUBLIC_APP_KEY ?? "",

  revenueCatKey:
    Platform.OS === "ios"
      ? env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ""
      : env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "",
  premiumEntitlement: env.EXPO_PUBLIC_PREMIUM_ENTITLEMENT_ID ?? "premium",

  ads: {
    bannerId:
      Platform.OS === "ios"
        ? env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID ?? ""
        : env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID ?? "",
    rewardedId:
      Platform.OS === "ios"
        ? env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID ?? ""
        : env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID ?? "",
  },

  links: {
    privacy: env.EXPO_PUBLIC_PRIVACY_URL ?? "",
    terms: env.EXPO_PUBLIC_TERMS_URL ?? "",
    support: env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "",
  },
};

export const FREE_LIMITS = {
  pets: 1,
  historyItems: 10,
};

export const PREMIUM_LIMITS = {
  pets: 10,
};
