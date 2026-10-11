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
import {
  CAT_PAIN_UNITS,
  isVoice,
  type AnalysisResponse,
  type AnyResult,
  type HistoryItem,
  type PetSpecies,
  type VoiceAnalysisResponse,
} from "@/lib/types";

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history, pets } = useApp();
  const item = history.find((h) => h.id === id) ?? session.get(id);
  if (!item) return null;
  const petName = pets.find((p) => p.id === item.petId)?.name;
  const r = item.result;
  if (isVoice(r)) {
    return r.usable ? <VoiceResult item={item} result={r} petName={petName} /> : <UnusableVoice result={r} />;
  }
  return r.usable ? <FaceResult item={item} result={r} petName={petName} /> : <UnusableFace result={r} />;
}

// ── shared pieces ───────────────────────────────────────────────────────────

function useShare(ref: React.RefObject<View | null>) {
  const { t } = useTranslation();
  const [sharing, setSharing] = useState(false);
  const share = async () => {
    setSharing(true);
    try {
      const uri = await captureRef(ref, { format: "png", quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch {
      Alert.alert(t("result.shareFailed"));
    } finally {
      setSharing(false);
    }
  };
  return { share, sharing };
}

function MoodCard({ result, extra }: { result: AnyResult; extra?: React.ReactNode }) {
  const { t } = useTranslation();
  const { mood } = result;
  return (
    <Card>
      <View style={styles.row}>
        <Text style={{ fontSize: 34 }}>{MOOD_EMOJI[mood.primary]}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[font.h2, { color: moodColor(mood.primary) }]}>{t(`moods.${mood.primary}`)}</Text>
          <View style={styles.chips}>
            <Chip label={t(`result.confidence.${mood.confidence}`)} fg={colors.sub} bg={colors.line} />
            {extra}
          </View>
        </View>
      </View>
      <Text style={font.body}>{mood.explanation}</Text>
    </Card>
  );
}

function HealthCard({
  result,
  areaLabel,
}: {
  result: AnyResult;
  areaLabel: (area: string) => string;
}) {
  const { t } = useTranslation();
  const vetLevel = LEVEL_COLORS[VET_LEVEL[result.vet_advice]];
  return (
    <Card>
      <SectionTitle>🩺 {t("result.health")}</SectionTitle>
      <View style={[styles.vetBanner, { backgroundColor: vetLevel.bg }]}>
        <Text style={[font.body, { color: vetLevel.fg, fontWeight: "800" }]}>{t(`result.vet.${result.vet_advice}`)}</Text>
      </View>
      {result.health_summary ? <Text style={font.body}>{result.health_summary}</Text> : null}
      {result.health_signs.map((s, i) => {
        const c = LEVEL_COLORS[s.level];
        return (
          <View key={i} style={styles.signRow}>
            <Chip label={t(`result.healthLevels.${s.level}`)} fg={c.fg} bg={c.bg} />
            <View style={{ flex: 1 }}>
              <Text style={[font.body, { fontWeight: "700" }]}>{areaLabel(s.area)}</Text>
              <Text style={font.small}>{s.finding}</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function CareAndProducts({ result, species }: { result: AnyResult; species: PetSpecies | null }) {
  const { t } = useTranslation();
  const products = recommendProducts(result.recommended_categories, species);
  return (
    <>
      {result.care_tips.length > 0 && (
        <Card>
          <SectionTitle>💛 {t("result.care")}</SectionTitle>
          {result.care_tips.map((tip, i) => (
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
    </>
  );
}

// ── face results ────────────────────────────────────────────────────────────

function UnusableFace({ result }: { result: AnalysisResponse }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { species, mood } = result;
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

function FaceResult({ item, result: r, petName }: { item: HistoryItem; result: AnalysisResponse; petName?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const shareRef = useRef<View>(null);
  const { share, sharing } = useShare(shareRef);
  const species = r.species === "cat" || r.species === "dog" ? r.species : null;
  const cardSize = Math.min(width - space.md * 2, 420);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ alignItems: "center" }}>
        <ShareCard ref={shareRef} item={item} petName={petName} size={cardSize} />
      </View>

      <MoodCard result={r} />

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

      <HealthCard result={r} areaLabel={(a) => t(`result.healthAreas.${a}`)} />

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

      <CareAndProducts result={r} species={species} />

      <Button title={t("result.share")} icon="📤" loading={sharing} onPress={share} />
      <Button variant="secondary" title={t("result.retake")} icon="📸" onPress={() => router.dismissTo("/")} />
      <Text style={[font.small, { textAlign: "center" }]}>{t("result.disclaimer")}</Text>
    </ScrollView>
  );
}

// ── sound results ───────────────────────────────────────────────────────────

function UnusableVoice({ result }: { result: VoiceAnalysisResponse }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={font.h2}>🤔 {t("voiceResult.notUsableTitle")}</Text>
        {result.source === "not_pet" && <Text style={font.body}>{t("voiceResult.notPet")}</Text>}
        <Text style={font.body}>{result.mood.explanation}</Text>
        <Text style={font.small}>{t("result.notCounted")}</Text>
      </Card>
      <Card>
        {(["tip1", "tip2", "tip3"] as const).map((k) => (
          <Text key={k} style={font.body}>
            • {t(`voice.${k}`)}
          </Text>
        ))}
      </Card>
      <Button title={t("voiceResult.retry")} icon="🎙️" onPress={() => router.replace("/record")} />
    </ScrollView>
  );
}

function VoiceResult({
  item,
  result: r,
  petName,
}: {
  item: HistoryItem;
  result: VoiceAnalysisResponse;
  petName?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const shareRef = useRef<View>(null);
  const { share, sharing } = useShare(shareRef);
  const species = r.source === "cat" || r.source === "dog" ? r.source : null;
  const cardSize = Math.min(width - space.md * 2, 420);
  const conditionColor =
    r.condition === "possible_discomfort"
      ? LEVEL_COLORS.concern
      : r.condition === "stressed"
        ? LEVEL_COLORS.watch
        : LEVEL_COLORS.ok;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ alignItems: "center" }}>
        <ShareCard ref={shareRef} item={item} petName={petName} size={cardSize} />
      </View>

      <MoodCard
        result={r}
        extra={<Chip label={t("voiceResult.badge")} fg={colors.primaryDark} bg={colors.primarySoft} />}
      />

      <Card>
        <View style={styles.statRow}>
          <Stat label={t("voiceResult.soundType")} value={t(`voiceResult.soundTypes.${r.sound_type}`)} />
          <Stat
            label={t("voiceResult.condition")}
            value={t(`voiceResult.conditions.${r.condition}`)}
            color={conditionColor.fg}
          />
          <Stat label={t("voiceResult.arousal")} value={t(`voiceResult.arousalLevels.${r.arousal}`)} />
        </View>
        {r.likely_needs.length > 0 && (
          <>
            <Text style={[font.small, { fontWeight: "700", marginTop: 6 }]}>{t("voiceResult.needs")}</Text>
            <View style={styles.chips}>
              {r.likely_needs.map((n) => (
                <Chip key={n} label={t(`voiceResult.needLabels.${n}`)} fg={colors.primaryDark} bg={colors.primarySoft} />
              ))}
            </View>
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>🔍 {t("voiceResult.cues")}</SectionTitle>
        {r.cues.map((c, i) => (
          <View key={i} style={styles.cue}>
            <Text style={styles.cuePart}>{t(`voiceResult.cueLabels.${c.cue}`)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={font.body}>{c.observation}</Text>
              <Text style={font.small}>→ {c.meaning}</Text>
            </View>
          </View>
        ))}
      </Card>

      <HealthCard result={r} areaLabel={(a) => t(`voiceResult.healthAreas.${a}`)} />

      <CareAndProducts result={r} species={species} />

      <Button title={t("result.share")} icon="📤" loading={sharing} onPress={share} />
      <Button variant="secondary" title={t("voiceResult.retry")} icon="🎙️" onPress={() => router.replace("/record")} />
      <Text style={[font.small, { textAlign: "center" }]}>{t("voiceResult.disclaimer")}</Text>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={font.small}>{label}</Text>
      <Text style={[font.body, { fontWeight: "800", color: color ?? colors.text, textAlign: "center" }]}>{value}</Text>
    </View>
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
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
  statRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
});
