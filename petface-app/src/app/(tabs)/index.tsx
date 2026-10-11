import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BannerAdSlot } from "@/components/BannerAdSlot";
import { PetSwitcher, SPECIES_EMOJI } from "@/components/PetSwitcher";
import { Button, Card } from "@/components/ui";
import { showRewardedAd } from "@/lib/ads";
import { api } from "@/lib/api";
import { pickPhoto, type PhotoSource } from "@/lib/image";
import { MOOD_EMOJI } from "@/lib/mood";
import { resolvePhoto } from "@/lib/photos";
import { useApp } from "@/lib/store";
import { colors, font, radius, space } from "@/lib/theme";

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedPet, quota, premium, history, refreshQuota, setQuota } = useApp();
  const [adLoading, setAdLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshQuota();
    }, [refreshQuota]),
  );

  const outOfQuota = quota !== null && quota.remaining <= 0;
  const last = history.find((h) => h.petId === selectedPet?.id && h.result.usable);

  const start = async (source: PhotoSource) => {
    if (outOfQuota) {
      Alert.alert(t("home.limitReached"));
      return;
    }
    const picked = await pickPhoto(source);
    if (!picked.ok) {
      if (picked.reason === "permission") {
        Alert.alert(t("home.permission"), undefined, [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("home.openSettings"), onPress: () => Linking.openSettings() },
        ]);
      }
      return;
    }
    router.push({ pathname: "/analyze", params: { uri: picked.uri } });
  };

  const watchAd = async () => {
    setAdLoading(true);
    try {
      const earned = await showRewardedAd();
      if (!earned) {
        Alert.alert(t("home.adNotFinished"));
        return;
      }
      setQuota(await api.claimAdBonus());
    } catch {
      Alert.alert(t("home.adFailed"));
    } finally {
      setAdLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <PetSwitcher />

        <Card style={styles.hero}>
          <Text style={styles.heroEmoji}>{selectedPet ? SPECIES_EMOJI[selectedPet.species] : "🐾"}</Text>
          <Text style={[font.title, { textAlign: "center", fontSize: 23 }]}>
            {selectedPet ? t("home.question", { name: selectedPet.name }) : t("home.questionNoPet")}
          </Text>
          <Button title={t("home.takePhoto")} icon="📸" onPress={() => start("camera")} />
          <Button variant="secondary" title={t("home.fromLibrary")} icon="🖼️" onPress={() => start("library")} />
          {quota && (
            <Text style={[font.small, { textAlign: "center" }]}>
              {premium
                ? t("home.premiumRemaining", { n: quota.remaining })
                : t("home.remaining", { n: quota.remaining })}
            </Text>
          )}
        </Card>

        {outOfQuota && !premium && (
          <Card style={{ backgroundColor: colors.primarySoft }}>
            <Text style={[font.body, { fontWeight: "700" }]}>{t("home.limitReached")}</Text>
            {quota!.bonusAvailable > 0 && (
              <Button variant="secondary" title={t("home.watchAd")} icon="🎬" loading={adLoading} onPress={watchAd} />
            )}
            <Button variant="premium" title={t("home.getPremium")} icon="✨" onPress={() => router.push("/paywall")} />
          </Card>
        )}

        {last && (
          <Pressable onPress={() => router.push(`/result/${last.id}`)}>
            <Card style={styles.lastCard}>
              <Image source={{ uri: resolvePhoto(last.photoUri) }} style={styles.lastPhoto} contentFit="cover" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={font.small}>{new Date(last.createdAt).toLocaleDateString()}</Text>
                <Text style={[font.body, { fontWeight: "700" }]} numberOfLines={1}>
                  {MOOD_EMOJI[last.result.mood.primary]} {t(`moods.${last.result.mood.primary}`)}
                </Text>
                <Text style={font.small} numberOfLines={1}>
                  {last.result.mood.headline}
                </Text>
              </View>
              <Text style={{ fontSize: 26, color: colors.sub }}>›</Text>
            </Card>
          </Pressable>
        )}

        <Card>
          <Text style={[font.h2, { fontSize: 16 }]}>💡 {t("home.tipsTitle")}</Text>
          {(["tip1", "tip2", "tip3"] as const).map((k) => (
            <Text key={k} style={font.body}>
              • {t(`home.${k}`)}
            </Text>
          ))}
        </Card>
      </ScrollView>
      <BannerAdSlot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.md, paddingBottom: space.xl },
  hero: { gap: 12, paddingVertical: space.lg },
  heroEmoji: { fontSize: 56, textAlign: "center" },
  lastCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  lastPhoto: { width: 60, height: 60, borderRadius: radius.sm },
});
