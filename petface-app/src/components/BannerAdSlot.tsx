import { View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { AD_REQUEST, bannerUnitId } from "@/lib/ads";
import { useApp } from "@/lib/store";

/** A bottom banner for free users; renders nothing for Premium. */
export function BannerAdSlot() {
  const { premium } = useApp();
  if (premium) return null;
  return (
    <View style={{ alignItems: "center" }}>
      <BannerAd
        unitId={bannerUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={AD_REQUEST}
      />
    </View>
  );
}
