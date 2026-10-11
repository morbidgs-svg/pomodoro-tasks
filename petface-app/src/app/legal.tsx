import { ScrollView, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui";
import { font, space } from "@/lib/theme";

export default function Legal() {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <Card>
        <Text style={font.h2}>⚠️ {t("onboarding.disclaimerTitle")}</Text>
        <Text style={font.body}>{t("onboarding.disclaimerBody")}</Text>
      </Card>
      <Card>
        <Text style={font.h2}>🔒 {t("settings.privacy")}</Text>
        <Text style={font.body}>{t("settings.privacyNote")}</Text>
      </Card>
      <Card>
        <Text style={font.h2}>🐱 {t("result.catPain")}</Text>
        <Text style={font.body}>{t("result.catPainHelp")}</Text>
      </Card>
    </ScrollView>
  );
}
