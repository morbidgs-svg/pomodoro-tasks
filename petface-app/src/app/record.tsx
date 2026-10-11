import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SPECIES_EMOJI } from "@/components/PetSwitcher";
import { SoundBars } from "@/components/SoundBars";
import { Button, Card } from "@/components/ui";
import { analyzeAudio } from "@/lib/acoustics";
import { ApiError, api, type ApiErrorCode } from "@/lib/api";
import { currentLanguage } from "@/lib/i18n";
import { usePetRecorder, type Recording } from "@/lib/recorder";
import { session } from "@/lib/session";
import { useApp } from "@/lib/store";
import { colors, font, space } from "@/lib/theme";
import { SOUND_CONTEXTS, type HistoryItem, type SoundContext } from "@/lib/types";

const MAX_SEC = 10;
const MIN_SEC = 1;

type Phase = "ready" | "recording" | "processing" | "quiet" | "error";

export default function Record() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedPet, quota, premium, addHistory, setQuota } = useApp();
  const [phase, setPhase] = useState<Phase>("ready");
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const [context, setContext] = useState<SoundContext | null>(null);

  const process = async (rec: Recording) => {
    const seconds = rec.samples.length / rec.sampleRate;
    if (seconds < MIN_SEC) {
      setPhase("ready");
      Alert.alert(t("voice.tooShort"));
      return;
    }
    setPhase("processing");
    // Let the spinner render before the (synchronous) analysis runs.
    await new Promise((r) => setTimeout(r, 50));
    const analysis = analyzeAudio(rec.samples, rec.sampleRate);
    if (!analysis.hasSound) {
      // Nothing worth sending: no API cost, no quota used.
      setPhase("quiet");
      return;
    }
    try {
      const { result, status } = await api.analyzeVoice({
        features: analysis.features,
        spectrogram: analysis.spectrogram,
        context: context ?? "other",
        locale: currentLanguage(),
        petName: selectedPet?.name,
        species: selectedPet?.species,
      });
      setQuota(status);
      const id = Crypto.randomUUID();
      const item: HistoryItem = {
        id,
        petId: selectedPet?.id ?? null,
        photoUri: "",
        result,
        envelope: analysis.envelope,
        createdAt: result.createdAt,
      };
      if (result.usable) await addHistory(item);
      else session.put(item);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace(`/result/${id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status) setQuota(e.status);
        setError(e.code);
      } else {
        setError("bad_audio");
      }
      setPhase("error");
    }
  };

  const recorder = usePetRecorder(MAX_SEC, process);

  const toggle = async () => {
    if (recorder.recording) {
      process(recorder.stop());
      return;
    }
    if (quota !== null && quota.remaining <= 0) {
      Alert.alert(t("home.limitReached"));
      return;
    }
    const started = await recorder.start();
    if (started === "permission") {
      Alert.alert(t("voice.permission"), undefined, [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("home.openSettings"), onPress: () => Linking.openSettings() },
      ]);
    } else if (started === "error") {
      Alert.alert(t("voice.errorStart"));
    } else {
      setPhase("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  };

  const busy = phase === "processing";
  const quotaError = error === "device_limit" || error === "ip_limit";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[font.title, styles.center, { fontSize: 22 }]}>
        {selectedPet ? `${SPECIES_EMOJI[selectedPet.species]} ` : "🐾 "}
        {selectedPet ? t("voice.heading", { name: selectedPet.name }) : t("voice.headingNoPet")}
      </Text>

      <Card>
        <Text style={[font.small, { fontWeight: "700" }]}>{t("voice.contextTitle")}</Text>
        <View style={styles.chips}>
          {SOUND_CONTEXTS.map((c) => (
            <Pressable
              key={c}
              disabled={recorder.recording || busy}
              onPress={() => setContext((cur) => (cur === c ? null : c))}
              style={[styles.chip, context === c && styles.chipOn]}
            >
              <Text style={[styles.chipText, context === c && { color: colors.primaryDark }]}>
                {t(`voice.contexts.${c}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.recCard}>
        <SoundBars values={recorder.levels} height={64} color={colors.primary} />
        <Pressable
          accessibilityRole="button"
          onPress={toggle}
          disabled={busy}
          style={({ pressed }) => [
            styles.mic,
            recorder.recording && styles.micOn,
            (pressed || busy) && { opacity: 0.8 },
          ]}
        >
          <Text style={{ fontSize: 44 }}>{recorder.recording ? "⏹️" : "🎙️"}</Text>
        </Pressable>
        <Text style={[font.body, styles.center, { fontWeight: "700" }]}>
          {busy
            ? t("voice.processing")
            : recorder.recording
              ? t("voice.recording", { sec: recorder.elapsed.toFixed(1), max: MAX_SEC })
              : t("voice.tapToRecord")}
        </Text>
        {recorder.recording && <Text style={[font.small, styles.center]}>{t("voice.tapToStop")}</Text>}
      </Card>

      {phase === "quiet" && (
        <Card style={{ backgroundColor: colors.watchSoft }}>
          <Text style={font.body}>🔇 {t("voice.quiet")}</Text>
        </Card>
      )}

      {phase === "error" && error && (
        <Card style={{ backgroundColor: colors.concernSoft }}>
          <Text style={font.body}>{t(`analyze.errors.${error}`)}</Text>
          {quotaError && !premium && (
            <Button variant="premium" title={t("home.getPremium")} onPress={() => router.replace("/paywall")} />
          )}
        </Card>
      )}

      <Card>
        {(["tip1", "tip2", "tip3"] as const).map((k) => (
          <Text key={k} style={font.body}>
            • {t(`voice.${k}`)}
          </Text>
        ))}
        <Text style={[font.small, { marginTop: 6 }]}>ℹ️ {t("voice.notice")}</Text>
        <Text style={font.small}>🔒 {t("voice.privacy")}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.md, paddingBottom: 48 },
  center: { textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.sub },
  recCard: { alignItems: "stretch", gap: 14, paddingVertical: space.lg },
  mic: {
    alignSelf: "center",
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  micOn: { backgroundColor: colors.concernSoft, borderColor: colors.concern },
});

