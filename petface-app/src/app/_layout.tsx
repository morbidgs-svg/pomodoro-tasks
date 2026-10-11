import "@/lib/i18n";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { initAds } from "@/lib/ads";
import { AppProvider, useApp } from "@/lib/store";
import { colors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootStack() {
  const { ready, premium } = useApp();
  const { t } = useTranslation();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useEffect(() => {
    if (ready && !premium) initAds();
  }, [ready, premium]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="pet-edit" options={{ presentation: "modal", title: t("pet.add") }} />
      <Stack.Screen name="analyze" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="record" options={{ title: t("voice.title") }} />
      <Stack.Screen name="result/[id]" options={{ title: t("result.title") }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="legal" options={{ title: t("settings.disclaimer") }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <RootStack />
    </AppProvider>
  );
}
