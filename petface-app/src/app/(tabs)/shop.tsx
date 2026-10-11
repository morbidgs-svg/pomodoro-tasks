import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { visibleProducts } from "@/config/products";
import { ProductCard } from "@/components/ProductCard";
import { useApp } from "@/lib/store";
import { colors, font, space } from "@/lib/theme";
import { PRODUCT_CATEGORIES, type PetSpecies, type ProductCategory } from "@/lib/types";

export default function Shop() {
  const { t } = useTranslation();
  const { selectedPet, history } = useApp();
  const [species, setSpecies] = useState<PetSpecies>(selectedPet?.species ?? "cat");
  const [category, setCategory] = useState<ProductCategory | null>(null);

  // Put categories from the latest result for this pet first.
  const latest = history.find((h) => h.petId === selectedPet?.id && h.result.usable);
  const suggested = useMemo(
    () => (species === selectedPet?.species ? latest?.result.recommended_categories ?? [] : []),
    [species, selectedPet?.species, latest],
  );

  const products = useMemo(() => {
    const list = visibleProducts().filter(
      (p) => p.species.includes(species) && (!category || p.categories.includes(category)),
    );
    const score = (cats: ProductCategory[]) =>
      cats.some((c) => suggested.includes(c)) ? 0 : 1;
    return list.sort(
      (a, b) =>
        score(a.categories) - score(b.categories) ||
        (a.source === "myshop" ? 0 : 1) - (b.source === "myshop" ? 0 : 1),
    );
  }, [species, category, suggested]);

  const categories = PRODUCT_CATEGORIES.filter((c) =>
    visibleProducts().some((p) => p.species.includes(species) && p.categories.includes(c)),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={font.small}>{t("shop.subtitle")}</Text>
      <View style={styles.row}>
        {(["cat", "dog"] as PetSpecies[]).map((s) => (
          <Toggle
            key={s}
            label={`${s === "cat" ? "🐱" : "🐶"} ${t(s === "cat" ? "shop.forCat" : "shop.forDog")}`}
            active={species === s}
            onPress={() => {
              setSpecies(s);
              setCategory(null);
            }}
          />
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Toggle label={t("history.all")} active={!category} onPress={() => setCategory(null)} />
        {categories.map((c) => (
          <Toggle
            key={c}
            label={`${suggested.includes(c) ? "⭐ " : ""}${t(`shop.categories.${c}`)}`}
            active={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>
      {products.length === 0 ? (
        <Text style={[font.body, { color: colors.sub, textAlign: "center", marginTop: 40 }]}>{t("shop.empty")}</Text>
      ) : (
        products.map((p) => <ProductCard key={p.id} product={p} />)
      )}
      {products.some((p) => p.source === "affiliate") && (
        <Text style={font.small}>{t("shop.affiliateDisclosure")}</Text>
      )}
    </ScrollView>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, active && styles.toggleOn]}>
      <Text style={{ fontWeight: "700", color: active ? colors.primaryDark : colors.sub }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.sm, paddingBottom: space.xl },
  row: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  toggleOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
