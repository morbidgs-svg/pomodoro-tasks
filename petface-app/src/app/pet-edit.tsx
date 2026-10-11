import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { PetForm } from "@/components/PetForm";
import { Button, Card } from "@/components/ui";
import { FREE_LIMITS, PREMIUM_LIMITS } from "@/lib/config";
import { useApp } from "@/lib/store";
import { colors, font, space } from "@/lib/theme";

export default function PetEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { pets, premium, addPet, updatePet, deletePet } = useApp();
  const pet = id ? pets.find((p) => p.id === id) : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({ title: pet ? t("pet.edit") : t("pet.add") });
  }, [navigation, pet, t]);

  const limit = premium ? PREMIUM_LIMITS.pets : FREE_LIMITS.pets;
  if (!pet && pets.length >= limit) {
    return (
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
        <Card>
          <Text style={font.body}>{t("pet.limitFree")}</Text>
        </Card>
        {!premium && (
          <Button variant="premium" title={t("settings.upgrade")} onPress={() => router.replace("/paywall")} />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <PetForm
        initial={pet ? { name: pet.name, species: pet.species } : undefined}
        submitLabel={t("common.save")}
        onSubmit={async (name, species) => {
          if (pet) await updatePet(pet.id, { name, species });
          else await addPet(name, species);
          router.back();
        }}
      />
      {pet && (
        <Button
          variant="ghost"
          title={t("common.delete")}
          style={{ borderColor: colors.concern }}
          onPress={() =>
            Alert.alert(t("common.delete"), t("pet.deleteConfirm", { name: pet.name }), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("common.delete"),
                style: "destructive",
                onPress: async () => {
                  await deletePet(pet.id);
                  router.back();
                },
              },
            ])
          }
        />
      )}
    </ScrollView>
  );
}
