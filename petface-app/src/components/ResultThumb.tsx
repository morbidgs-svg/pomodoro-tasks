import { Image } from "expo-image";
import { View } from "react-native";
import { resolvePhoto } from "@/lib/photos";
import { colors, radius } from "@/lib/theme";
import { isVoice, type HistoryItem } from "@/lib/types";
import { SoundBars } from "./SoundBars";

/** Photo thumbnail, or a small sound-wave tile for sound results. */
export function ResultThumb({ item, size }: { item: HistoryItem; size: number }) {
  if (isVoice(item.result)) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.sm,
          backgroundColor: colors.primary,
          justifyContent: "center",
          paddingHorizontal: 8,
        }}
      >
        <SoundBars values={(item.envelope ?? []).filter((_, i) => i % 4 === 0)} height={size * 0.5} color="#fff" gap={2} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: resolvePhoto(item.photoUri) }}
      style={{ width: size, height: size, borderRadius: radius.sm }}
      contentFit="cover"
    />
  );
}
