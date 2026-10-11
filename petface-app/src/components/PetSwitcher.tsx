import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useApp } from "@/lib/store";
import { colors, radius } from "@/lib/theme";

export const SPECIES_EMOJI = { cat: "🐱", dog: "🐶" } as const;

/** Horizontal row of pet chips plus an "add" chip. */
export function PetSwitcher() {
  const { usablePets, selectedPet, selectPet } = useApp();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {usablePets.map((p) => {
        const active = p.id === selectedPet?.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => selectPet(p.id)}
            style={[styles.chip, active && styles.active]}
          >
            <Text style={[styles.text, active && styles.activeText]}>
              {SPECIES_EMOJI[p.species]} {p.name}
            </Text>
          </Pressable>
        );
      })}
      <Pressable onPress={() => router.push("/pet-edit")} style={styles.chip}>
        <Text style={styles.text}>＋ {t("pet.add")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  active: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  text: { fontSize: 15, fontWeight: "600", color: colors.sub },
  activeText: { color: colors.primaryDark },
});
