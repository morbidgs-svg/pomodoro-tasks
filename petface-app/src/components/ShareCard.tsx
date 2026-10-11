import { Image } from "expo-image";
import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MOOD_EMOJI } from "@/lib/mood";
import { resolvePhoto } from "@/lib/photos";
import { colors } from "@/lib/theme";
import type { HistoryItem } from "@/lib/types";

/** The square image that gets captured and shared to SNS. */
export const ShareCard = forwardRef<View, { item: HistoryItem; petName?: string; size: number }>(
  function ShareCard({ item, petName, size }, ref) {
    const { t } = useTranslation();
    const { mood } = item.result;
    return (
      <View ref={ref} collapsable={false} style={[styles.card, { width: size, height: size }]}>
        <Image source={{ uri: resolvePhoto(item.photoUri) }} style={{ width: size, height: size, position: "absolute" }} contentFit="cover" />
        <View style={styles.overlay}>
          <Text style={styles.mood}>
            {MOOD_EMOJI[mood.primary]} {petName ? `${petName} · ` : ""}
            {t(`moods.${mood.primary}`)}
          </Text>
          <Text style={styles.headline}>{mood.headline}</Text>
          <Text style={styles.voice}>“{mood.pet_voice}”</Text>
          <Text style={styles.brand}>🐾 {t("result.madeWith")}</Text>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: "hidden", backgroundColor: colors.card },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    gap: 4,
    backgroundColor: "rgba(30,20,15,0.55)",
  },
  mood: { color: "#FFE9DF", fontSize: 14, fontWeight: "700" },
  headline: { color: "#fff", fontSize: 21, fontWeight: "800" },
  voice: { color: "#fff", fontSize: 15 },
  brand: { color: "#FFD1BF", fontSize: 12, fontWeight: "700", marginTop: 4 },
});
