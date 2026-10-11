import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SPECIES_EMOJI } from "@/components/PetSwitcher";
import { Card } from "@/components/ui";
import { config } from "@/lib/config";
import { LANGUAGE_LABELS, LANGUAGES } from "@/lib/i18n";
import { restore } from "@/lib/purchases";
import { useApp } from "@/lib/store";
import { colors, font, space } from "@/lib/theme";

export default function Settings() {
  const { t } = useTranslation();
  const router = useRouter();
  const { pets, usablePets, settings, premium, setLanguage, clearAll, refreshPremium } = useApp();

  const doRestore = async () => {
    try {
      const ok = await restore();
      if (ok) await refreshPremium();
      Alert.alert(ok ? t("paywall.restored") : t("paywall.notRestored"));
    } catch {
      Alert.alert(t("paywall.failed"));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title={t("settings.pets")}>
        {pets.map((p) => (
          <Row
            key={p.id}
            label={`${SPECIES_EMOJI[p.species]} ${p.name}`}
            muted={!usablePets.includes(p)}
            onPress={() => router.push({ pathname: "/pet-edit", params: { id: p.id } })}
          />
        ))}
        <Row label={`＋ ${t("pet.add")}`} onPress={() => router.push("/pet-edit")} />
      </Section>

      <Section title={t("settings.membership")}>
        <Row label={premium ? `✨ ${t("settings.premiumActive")}` : t("settings.free")} />
        {!premium && <Row label={t("settings.upgrade")} accent onPress={() => router.push("/paywall")} />}
        <Row label={t("settings.restore")} onPress={doRestore} />
      </Section>

      <Section title={t("settings.language")}>
        <Row
          label={t("settings.languageAuto")}
          checked={settings.language === null}
          onPress={() => setLanguage(null)}
        />
        {LANGUAGES.map((l) => (
          <Row key={l} label={LANGUAGE_LABELS[l]} checked={settings.language === l} onPress={() => setLanguage(l)} />
        ))}
      </Section>

      <Section title={t("common.appName")}>
        <Row label={t("settings.disclaimer")} onPress={() => router.push("/legal")} />
        {!!config.links.privacy && (
          <Row label={t("settings.privacy")} onPress={() => WebBrowser.openBrowserAsync(config.links.privacy)} />
        )}
        {!!config.links.terms && (
          <Row label={t("settings.terms")} onPress={() => WebBrowser.openBrowserAsync(config.links.terms)} />
        )}
        {!!config.links.support && (
          <Row label={t("settings.contact")} onPress={() => Linking.openURL(`mailto:${config.links.support}`)} />
        )}
        <Row
          label={t("settings.deleteAll")}
          danger
          onPress={() =>
            Alert.alert(t("settings.deleteAll"), t("settings.deleteAllConfirm"), [
              { text: t("common.cancel"), style: "cancel" },
              { text: t("common.delete"), style: "destructive", onPress: () => clearAll() },
            ])
          }
        />
      </Section>

      <Text style={[font.small, { textAlign: "center" }]}>{t("settings.privacyNote")}</Text>
      <Text style={[font.small, { textAlign: "center" }]}>
        {t("settings.version", { v: Constants.expoConfig?.version ?? "1.0.0" })}
      </Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[font.small, { fontWeight: "700", marginLeft: 4 }]}>{title}</Text>
      <Card style={{ paddingVertical: 4, gap: 0 }}>{children}</Card>
    </View>
  );
}

function Row({
  label,
  onPress,
  checked,
  accent,
  danger,
  muted,
}: {
  label: string;
  onPress?: () => void;
  checked?: boolean;
  accent?: boolean;
  danger?: boolean;
  muted?: boolean;
}) {
  const color = danger ? colors.concern : accent ? colors.premium : muted ? colors.sub : colors.text;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <Text style={[font.body, { color, flex: 1, fontWeight: accent ? "800" : "500" }]}>{label}</Text>
      {checked ? <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text> : null}
      {onPress && checked === undefined ? <Text style={{ color: colors.sub, fontSize: 20 }}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.lg, paddingBottom: 48 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
});
