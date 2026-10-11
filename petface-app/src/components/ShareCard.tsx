import { Image } from "expo-image";
import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MOOD_EMOJI } from "@/lib/mood";
import { resolvePhoto } from "@/lib/photos";
import { colors } from "@/lib/theme";
import { isVoice, type HistoryItem } from "@/lib/types";
import { SoundBars } from "./SoundBars";

const SPECIES_EMOJI = { cat: "🐱", dog: "🐶" } as const;

/** The square image that gets captured and shared to SNS. */
export const ShareCard = forwardRef<View, { item: HistoryItem; petName?: string; size: number }>(
  function ShareCard({ item, petName, size }, ref) {
    const { t } = useTranslation();
    const r = item.result;
    const { mood } = r;
    return (
      <View ref={ref} collapsable={false} style={[styles.card, { width: size, height: size }]}>
        {isVoice(r) ? (
          // Sound results have no photo: a warm card with the clip's shape.
          <View style={[styles.voiceBg, { width: size, height: size }]}>
            <Text style={styles.voiceBadge}>
              🎙️ {t(`voiceResult.soundTypes.${r.sound_type}`)}
            </Text>
            <Text style={{ fontSize: size * 0.26, textAlign: "center" }}>
              {r.source === "cat" || r.source === "dog" ? SPECIES_EMOJI[r.source] : "🐾"}
            </Text>
            <View style={{ paddingHorizontal: 24 }}>
              <SoundBars values={item.envelope ?? []} height={size * 0.16} color="#fff" />
            </View>
          </View>
        ) : (
          <Image
            source={{ uri: resolvePhoto(item.photoUri) }}
            style={{ width: size, height: size, position: "absolute" }}
            contentFit="cover"
          />
        )}
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
  voiceBg: {
    position: "absolute",
    backgroundColor: colors.primary,
    paddingTop: 22,
    gap: 6,
  },
  voiceBadge: {
    alignSelf: "center",
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
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
