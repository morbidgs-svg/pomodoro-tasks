import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PetForm } from "@/components/PetForm";
import { Button, Card } from "@/components/ui";
import { useApp } from "@/lib/store";
import { colors, font, space } from "@/lib/theme";

export default function Onboarding() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, acceptDisclaimer, addPet } = useApp();
  const [step, setStep] = useState<"intro" | "pet">(settings.acceptedDisclaimer ? "pet" : "intro");
  const [checked, setChecked] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {step === "intro" ? (
            <>
              <Text style={styles.hero}>🐶🐱</Text>
              <Text style={[font.title, { textAlign: "center" }]}>{t("onboarding.title")}</Text>
              <Text style={[font.body, styles.center, { color: colors.sub }]}>{t("onboarding.subtitle")}</Text>
              <Card>
                {(["point1", "point2", "point3"] as const).map((k, i) => (
                  <Text key={k} style={font.body}>
                    {["😊", "🩺", "🎁"][i]}  {t(`onboarding.${k}`)}
                  </Text>
                ))}
              </Card>
              <Card style={{ backgroundColor: colors.watchSoft }}>
                <Text style={[font.h2, { fontSize: 16 }]}>⚠️ {t("onboarding.disclaimerTitle")}</Text>
                <Text style={font.body}>{t("onboarding.disclaimerBody")}</Text>
                <Pressable style={styles.check} onPress={() => setChecked((c) => !c)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
                  <View style={[styles.box, checked && styles.boxOn]}>
                    {checked && <Text style={{ color: "#fff", fontWeight: "900" }}>✓</Text>}
                  </View>
                  <Text style={[font.body, { fontWeight: "700", flex: 1 }]}>{t("onboarding.agree")}</Text>
                </Pressable>
              </Card>
              <Button
                title={t("onboarding.next")}
                disabled={!checked}
                onPress={async () => {
                  await acceptDisclaimer();
                  setStep("pet");
                }}
              />
            </>
          ) : (
            <>
              <Text style={styles.hero}>🐾</Text>
              <Text style={[font.title, styles.center]}>{t("onboarding.addPetTitle")}</Text>
              <PetForm
                submitLabel={t("common.save")}
                onSubmit={async (name, species) => {
                  await addPet(name, species);
                  router.replace("/");
                }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  hero: { fontSize: 64, textAlign: "center", marginTop: space.lg },
  center: { textAlign: "center" },
  check: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  boxOn: { backgroundColor: colors.primary },
});
