import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useTranslation } from "react-i18next";
import { recommendProducts } from "@/config/products";
import { ProductCard } from "@/components/ProductCard";
import { ShareCard } from "@/components/ShareCard";
import { Button, Card, Chip, SectionTitle } from "@/components/ui";
import { LEVEL_COLORS, MOOD_EMOJI, VET_LEVEL, moodColor } from "@/lib/mood";
import { session } from "@/lib/session";
import { useApp } from "@/lib/store";
import { colors, font, space } from "@/lib/theme";
import { CAT_PAIN_UNITS, type HistoryItem } from "@/lib/types";

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history, pets } = useApp();
  const item = history.find((h) => h.id === id) ?? session.get(id);
  if (!item) return null;
  return item.result.usable ? (
    <UsableResult item={item} petName={pets.find((p) => p.id === item.petId)?.name} />
  ) : (
    <UnusableResult item={item} />
  );
}

function UnusableResult({ item }: { item: HistoryItem }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { species, mood } = item.result;
  const speciesMsg =
    species === "other_animal" || species === "no_animal" ? t(`result.species.${species}`) : null;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={font.h2}>🤔 {t("result.notUsableTitle")}</Text>
        {speciesMsg && <Text style={font.body}>{speciesMsg}</Text>}
        <Text style={font.body}>{mood.explanation}</Text>
        <Text style={font.small}>{t("result.notCounted")}</Text>
      </Card>
      <Card>
        <Text style={[font.h2, { fontSize: 16 }]}>💡 {t("home.tipsTitle")}</Text>
        {(["tip1", "tip2", "tip3"] as const).map((k) => (
          <Text key={k} style={font.body}>
            • {t(`home.${k}`)}
          </Text>
        ))}
      </Card>
      <Button title={t("result.retake")} icon="📸" onPress={() => router.back()} />
    </ScrollView>
  );
}

function UsableResult({ item, petName }: { item: HistoryItem; petName?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const shareRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const r = item.result;
  const species = r.species === "cat" || r.species === "dog" ? r.species : null;
  const products = recommendProducts(r.recommended_categories, species);
  const vetLevel = LEVEL_COLORS[VET_LEVEL[r.vet_advice]];
  const cardSize = Math.min(width - space.md * 2, 420);

  const share = async () => {
    setSharing(true);
    try {
      const uri = await captureRef(shareRef, { format: "png", quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch {
      Alert.alert(t("result.shareFailed"));
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ alignItems: "center" }}>
        <ShareCard ref={shareRef} item={item} petName={petName} size={cardSize} />
      </View>

      <Card>
        <View style={styles.row}>
          <Text style={{ fontSize: 34 }}>{MOOD_EMOJI[r.mood.primary]}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[font.h2, { color: moodColor(r.mood.primary) }]}>{t(`moods.${r.mood.primary}`)}</Text>
            <Chip label={t(`result.confidence.${r.mood.confidence}`)} fg={colors.sub} bg={colors.line} />
          </View>
        </View>
        <Text style={font.body}>{r.mood.explanation}</Text>
      </Card>

      <Card>
        <SectionTitle>🔍 {t("result.cues")}</SectionTitle>
        {r.cues.map((c, i) => (
          <View key={i} style={styles.cue}>
            <Text style={styles.cuePart}>{t(`cueParts.${c.part}`)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={font.body}>{c.observation}</Text>
              <Text style={font.small}>→ {c.meaning}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle>🩺 {t("result.health")}</SectionTitle>
        <View style={[styles.vetBanner, { backgroundColor: vetLevel.bg }]}>
          <Text style={[font.body, { color: vetLevel.fg, fontWeight: "800" }]}>{t(`result.vet.${r.vet_advice}`)}</Text>
        </View>
        {r.health_summary ? <Text style={font.body}>{r.health_summary}</Text> : null}
        {r.health_signs.map((s, i) => {
          const c = LEVEL_COLORS[s.level];
          return (
            <View key={i} style={styles.signRow}>
              <Chip label={t(`result.healthLevels.${s.level}`)} fg={c.fg} bg={c.bg} />
              <View style={{ flex: 1 }}>
                <Text style={[font.body, { fontWeight: "700" }]}>{t(`result.healthAreas.${s.area}`)}</Text>
                <Text style={font.small}>{s.finding}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      {r.catPain && (
        <Card>
          <SectionTitle
            right={
              r.catPain.level !== "insufficient" ? (
                <Text style={[font.h2, { color: painColor(r.catPain.level) }]}>
                  {t("result.catPainScore", { total: r.catPain.total, max: r.catPain.max })}
                </Text>
              ) : undefined
            }
          >
            🐱 {t("result.catPain")}
          </SectionTitle>
          <Text style={[font.body, { fontWeight: "700", color: painColor(r.catPain.level) }]}>
            {t(`result.painLevel.${r.catPain.level}`)}
          </Text>
          {CAT_PAIN_UNITS.map((u) => {
            const s = r.cat_pain_check[u];
            return (
              <View key={u} style={styles.painRow}>
                <Text style={[font.body, { flex: 1 }]}>{t(`result.painUnits.${u}`)}</Text>
                {s.visible ? (
                  <View style={styles.dots}>
                    {[0, 1].map((d) => (
                      <View
                        key={d}
                        style={[styles.dot, d < s.score && { backgroundColor: s.score === 2 ? colors.concern : colors.watch }]}
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={font.small}>{t("result.notVisible")}</Text>
                )}
              </View>
            );
          })}
          <Text style={font.small}>{t("result.catPainHelp")}</Text>
        </Card>
      )}

      {r.care_tips.length > 0 && (
        <Card>
          <SectionTitle>💛 {t("result.care")}</SectionTitle>
          {r.care_tips.map((tip, i) => (
            <Text key={i} style={font.body}>
              {i + 1}. {tip}
            </Text>
          ))}
        </Card>
      )}

      {products.length > 0 && (
        <View style={{ gap: space.sm }}>
          <SectionTitle>🎁 {t("result.products")}</SectionTitle>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          {products.some((p) => p.source === "affiliate") && (
            <Text style={font.small}>{t("shop.affiliateDisclosure")}</Text>
          )}
        </View>
      )}

      <Button title={t("result.share")} icon="📤" loading={sharing} onPress={share} />
      <Button variant="secondary" title={t("result.retake")} icon="📸" onPress={() => router.dismissTo("/")} />
      <Text style={[font.small, { textAlign: "center" }]}>{t("result.disclaimer")}</Text>
    </ScrollView>
  );
}

function painColor(level: string): string {
  if (level === "high") return colors.concern;
  if (level === "mild") return colors.watch;
  if (level === "low") return colors.ok;
  return colors.sub;
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.md, paddingBottom: 48 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  cue: { flexDirection: "row", gap: 10, paddingVertical: 4 },
  cuePart: {
    width: 64,
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryDark,
    paddingTop: 3,
  },
  vetBanner: { padding: 12, borderRadius: 12 },
  signRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 4 },
  painRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.line },
});
