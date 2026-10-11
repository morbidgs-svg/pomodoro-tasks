import mobileAds, {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";
import { config } from "./config";

// Google's test ad units are used in development builds and whenever no real
// unit ID is configured, so nobody accidentally clicks live ads while testing.
export const bannerUnitId = __DEV__ || !config.ads.bannerId ? TestIds.ADAPTIVE_BANNER : config.ads.bannerId;
const rewardedUnitId = __DEV__ || !config.ads.rewardedId ? TestIds.REWARDED : config.ads.rewardedId;

// Non-personalised ads only: no cross-app tracking, so no App Tracking
// Transparency prompt is needed. Lower revenue per ad, simpler review.
export const AD_REQUEST = { requestNonPersonalizedAdsOnly: true } as const;

let initPromise: Promise<unknown> | null = null;

export function initAds(): Promise<unknown> {
  initPromise ??= mobileAds().initialize().catch(() => undefined);
  return initPromise;
}

/**
 * Loads and shows one rewarded ad. Resolves true only if the viewer earned
 * the reward (watched to the end), false if it failed or was closed early.
 */
export async function showRewardedAd(): Promise<boolean> {
  await initAds();
  const ad = RewardedAd.createForAdRequest(rewardedUnitId, AD_REQUEST);
  return new Promise<boolean>((resolve) => {
    let earned = false;
    let done = false;
    const unsubs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        // The timeout only guards loading; once the ad shows, wait for CLOSED.
        clearTimeout(loadTimer);
        ad.show().catch(() => finish());
      }),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => finish()),
      ad.addAdEventListener(AdEventType.ERROR, () => finish()),
    ];
    const loadTimer = setTimeout(() => finish(), 20_000);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(loadTimer);
      unsubs.forEach((u) => u());
      resolve(earned);
    }
    ad.load();
  });
}
