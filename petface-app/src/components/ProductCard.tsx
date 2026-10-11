import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Product } from "@/config/products";
import { currentLanguage } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

const CATEGORY_EMOJI: Record<string, string> = {
  toy: "🧸",
  chew: "🦴",
  scratcher: "🪵",
  treat: "🍖",
  calming: "🌙",
  bed: "🛏️",
  grooming: "🪮",
  dental: "🦷",
  water: "💧",
  walk: "🦮",
  health_check: "🩺",
};

export function ProductCard({ product }: { product: Product & { sample: boolean } }) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const open = () => {
    if (product.url) WebBrowser.openBrowserAsync(product.url);
  };
  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.thumb}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.img} contentFit="cover" />
        ) : (
          <Text style={{ fontSize: 30 }}>{CATEGORY_EMOJI[product.categories[0]] ?? "🛍️"}</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {product.source === "myshop" && <Text style={styles.badge}>{t("shop.myShop")}</Text>}
          {product.sample && <Text style={[styles.badge, styles.sample]}>SAMPLE</Text>}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {product.title[lang]}
        </Text>
        <Text style={styles.meta}>
          {product.priceText?.[lang] ?? ""}
          {product.priceText?.[lang] ? " · " : ""}
          {product.categories.map((c) => t(`shop.categories.${c}`)).join(" · ")}
        </Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  img: { width: 64, height: 64 },
  badge: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  sample: { color: colors.sub, backgroundColor: colors.line },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.sub },
  chev: { fontSize: 28, color: colors.sub },
});
