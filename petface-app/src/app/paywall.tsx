import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button, Card } from "@/components/ui";
import { config } from "@/lib/config";
import { buy, getPackages, purchasesAvailable, restore } from "@/lib/purchases";
import { useApp } from "@/lib/store";
import { colors, font, radius, space } from "@/lib/theme";

export default function Paywall() {
  const { t } = useTranslation();
  const router = useRouter();
  const { refreshPremium } = useApp();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPackages()
      .then((pkgs) => {
        setPackages(pkgs);
        const annual = pkgs.find((p) => p.packageType === "ANNUAL");
        setSelected((annual ?? pkgs[0])?.identifier ?? null);
      })
      .catch(() => setPackages([]));
  }, []);

  const periodLabel = (p: PurchasesPackage) => {
    if (p.packageType === "MONTHLY") return t("paywall.perMonth");
    if (p.packageType === "ANNUAL") return t("paywall.perYear");
    if (p.packageType === "LIFETIME") return t("paywall.lifetime");
    return "";
  };

  const purchase = async () => {
    const pkg = packages?.find((p) => p.identifier === selected);
    if (!pkg) return;
    setBusy(true);
    const outcome = await buy(pkg);
    setBusy(false);
    if (outcome === "purchased") {
      await refreshPremium();
      Alert.alert(t("paywall.welcome"));
      router.back();
    } else if (outcome === "failed") {
      Alert.alert(t("paywall.failed"));
    }
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      const ok = await restore();
      if (ok) await refreshPremium();
      Alert.alert(ok ? t("paywall.restored") : t("paywall.notRestored"));
      if (ok) router.back();
    } catch {
      Alert.alert(t("paywall.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.close} hitSlop={12}>
          <Text style={{ fontSize: 26, color: colors.sub }}>✕</Text>
        </Pressable>
        <Text style={styles.hero}>✨🐾</Text>
        <Text style={[font.title, styles.center]}>{t("paywall.title")}</Text>
        <Text style={[font.body, styles.center, { color: colors.sub }]}>{t("paywall.subtitle")}</Text>

        <Card>
          {(["f1", "f2", "f3", "f4"] as const).map((k) => (
            <Text key={k} style={font.body}>
              ✅ {t(`paywall.${k}`)}
            </Text>
          ))}
        </Card>

        {!purchasesAvailable() || (packages && packages.length === 0) ? (
          <Text style={[font.body, styles.center]}>{t("paywall.notAvailable")}</Text>
        ) : packages === null ? (
          <ActivityIndicator color={colors.premium} />
        ) : (
          <View style={{ gap: 10 }}>
            {packages.map((p) => {
              const on = p.identifier === selected;
              return (
                <Pressable
                  key={p.identifier}
                  onPress={() => setSelected(p.identifier)}
                  style={[styles.pkg, on && styles.pkgOn]}
                >
                  <Text style={[font.body, { fontWeight: "800", flex: 1 }]}>{p.product.title}</Text>
                  <Text style={[font.body, { fontWeight: "800", color: on ? colors.premium : colors.text }]}>
                    {p.product.priceString} {periodLabel(p)}
                  </Text>
                </Pressable>
              );
            })}
            <Button variant="premium" title={t("settings.upgrade")} loading={busy} onPress={purchase} />
          </View>
        )}

        <Button variant="ghost" title={t("paywall.restore")} disabled={busy} onPress={doRestore} />
        <Text style={font.small}>{t("paywall.legal")}</Text>
        <View style={styles.links}>
          {!!config.links.terms && (
            <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(config.links.terms)}>
              {t("paywall.terms")}
            </Text>
          )}
          {!!config.links.privacy && (
            <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(config.links.privacy)}>
              {t("paywall.privacy")}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  close: { alignSelf: "flex-end" },
  hero: { fontSize: 52, textAlign: "center" },
  center: { textAlign: "center" },
  pkg: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
    gap: 10,
  },
  pkgOn: { borderColor: colors.premium, backgroundColor: colors.premiumSoft },
  links: { flexDirection: "row", justifyContent: "center", gap: 20 },
  link: { color: colors.accent, fontSize: 14, textDecorationLine: "underline" },
});
