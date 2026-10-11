import { Text, View } from "react-native";
import { useApp } from "@/lib/store";
import { colors } from "@/lib/theme";

/** Web preview stand-in that shows where the AdMob banner will sit. */
export function BannerAdSlot() {
  const { premium } = useApp();
  if (premium) return null;
  return (
    <View style={{ height: 56, alignItems: "center", justifyContent: "center", backgroundColor: colors.line }}>
      <Text style={{ color: colors.sub, fontSize: 12 }}>AD BANNER (AdMob)</Text>
    </View>
  );
}
