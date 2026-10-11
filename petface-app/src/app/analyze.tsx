import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";
import { ApiError, api, type ApiErrorCode } from "@/lib/api";
import { currentLanguage } from "@/lib/i18n";
import { preparePhoto } from "@/lib/image";
import { session } from "@/lib/session";
import { persistPhoto } from "@/lib/storage";
import { useApp } from "@/lib/store";
import { colors, font, radius, space } from "@/lib/theme";
import type { HistoryItem } from "@/lib/types";

const STEPS = ["step1", "step2", "step3", "step4"] as const;

export default function Analyze() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedPet, addHistory, setQuota, premium } = useApp();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (error) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500);
    return () => clearInterval(timer);
  }, [error]);

  useEffect(() => {
    if (!uri || started.current === attempt) return;
    started.current = attempt;
    (async () => {
      try {
        const photo = await preparePhoto(uri);
        const { result, status } = await api.analyze({
          image: photo.base64,
          locale: currentLanguage(),
          petName: selectedPet?.name,
          species: selectedPet?.species,
        });
        setQuota(status);
        const id = Crypto.randomUUID();
        const item: HistoryItem = {
          id,
          petId: selectedPet?.id ?? null,
          photoUri: photo.uri,
          result,
          createdAt: result.createdAt,
        };
        if (result.usable) {
          item.photoUri = await persistPhoto(photo.uri, id);
          await addHistory(item);
        } else {
          session.put(item);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        router.replace(`/result/${id}`);
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.status) setQuota(e.status);
          setError(e.code);
        } else {
          setError("bad_image");
        }
      }
    })();
    // selectedPet is read once per attempt on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, attempt]);

  const quotaError = error === "device_limit" || error === "ip_limit";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {!!uri && <Image source={{ uri }} style={styles.photo} contentFit="cover" />}
        {error ? (
          <>
            <Text style={font.title}>{t("analyze.errorTitle")}</Text>
            <Text style={[font.body, styles.center]}>{t(`analyze.errors.${error}`)}</Text>
            {quotaError && !premium ? (
              <Button
                variant="premium"
                title={t("home.getPremium")}
                style={styles.full}
                onPress={() => router.replace("/paywall")}
              />
            ) : (
              <Button
                title={t("common.retry")}
                style={styles.full}
                onPress={() => {
                  setError(null);
                  setStep(0);
                  setAttempt((a) => a + 1);
                }}
              />
            )}
            <Button variant="ghost" title={t("common.close")} style={styles.full} onPress={() => router.back()} />
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={font.title}>{t("analyze.title")}</Text>
            <Text style={[font.body, { color: colors.sub }]}>{t(`analyze.${STEPS[step]}`)}</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg, gap: space.md },
  photo: { width: 220, height: 220, borderRadius: radius.lg, marginBottom: space.md },
  center: { textAlign: "center" },
  full: { alignSelf: "stretch" },
});
