import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, font, radius } from "@/lib/theme";
import type { PetSpecies } from "@/lib/types";
import { Button } from "./ui";

export function PetForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: { name: string; species: PetSpecies };
  submitLabel: string;
  onSubmit: (name: string, species: PetSpecies) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [species, setSpecies] = useState<PetSpecies>(initial?.species ?? "cat");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError(t("pet.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      await onSubmit(name.trim(), species);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>{t("pet.species")}</Text>
        <View style={styles.row}>
          {(["cat", "dog"] as PetSpecies[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSpecies(s)}
              style={[styles.option, species === s && styles.optionActive]}
            >
              <Text style={{ fontSize: 40 }}>{s === "cat" ? "🐱" : "🐶"}</Text>
              <Text style={[styles.optionText, species === s && { color: colors.primaryDark }]}>
                {t(`pet.${s}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>{t("pet.name")}</Text>
        <TextInput
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError("");
          }}
          placeholder={t("pet.namePlaceholder")}
          placeholderTextColor={colors.sub}
          maxLength={20}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        {!!error && <Text style={{ color: colors.concern }}>{error}</Text>}
      </View>
      <Button title={submitLabel} onPress={submit} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...font.small, fontWeight: "700" },
  row: { flexDirection: "row", gap: 12 },
  option: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
    gap: 4,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { fontSize: 16, fontWeight: "700", color: colors.sub },
  input: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    fontSize: 17,
    color: colors.text,
  },
});
