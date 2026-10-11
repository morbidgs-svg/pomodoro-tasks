import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BannerAdSlot } from "@/components/BannerAdSlot";
import { SPECIES_EMOJI } from "@/components/PetSwitcher";
import { TrendChart } from "@/components/TrendChart";
import { Button, Card, Chip } from "@/components/ui";
import { FREE_LIMITS } from "@/lib/config";
import { LEVEL_COLORS, MOOD_EMOJI, VET_LEVEL } from "@/lib/mood";
import { resolvePhoto } from "@/lib/photos";
import { useApp } from "@/lib/store";
import { colors, font, radius, space } from "@/lib/theme";

export default function History() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { history, usablePets, premium, deleteHistory } = useApp();
  const [petId, setPetId] = useState<string | null>(null);

  const items = useMemo(
    () => history.filter((h) => h.result.usable && (!petId || h.petId === petId)),
    [history, petId],
  );

  const header = (
    <View style={{ gap: space.md }}>
      {usablePets.length > 1 && (
        <View style={styles.filters}>
          <FilterChip label={t("history.all")} active={!petId} onPress={() => setPetId(null)} />
          {usablePets.map((p) => (
            <FilterChip
              key={p.id}
              label={`${SPECIES_EMOJI[p.species]} ${p.name}`}
              active={petId === p.id}
              onPress={() => setPetId(p.id)}
            />
          ))}
        </View>
      )}
      <Card>
        <Text style={[font.h2, { fontSize: 16 }]}>📈 {t("history.trendTitle")}</Text>
        {premium ? (
          <TrendChart items={items} width={width - space.md * 4} />
        ) : (
          <>
            <Text style={font.small}>🔒 {t("history.trendLocked")}</Text>
            <Button variant="premium" title={t("settings.upgrade")} onPress={() => router.push("/paywall")} />
          </>
        )}
      </Card>
      {!premium && history.length >= FREE_LIMITS.historyItems && (
        <Text style={font.small}>{t("history.limitNotice", { n: FREE_LIMITS.historyItems })}</Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.container}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={styles.empty}>{t("history.empty")}</Text>}
        renderItem={({ item }) => {
          const level = LEVEL_COLORS[VET_LEVEL[item.result.vet_advice]];
          return (
            <Pressable
              onPress={() => router.push(`/result/${item.id}`)}
              onLongPress={() =>
                Alert.alert(t("history.deleteConfirm"), undefined, [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("common.delete"), style: "destructive", onPress: () => deleteHistory(item.id) },
                ])
              }
              style={styles.row}
            >
              <Image source={{ uri: resolvePhoto(item.photoUri) }} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={font.small}>{new Date(item.createdAt).toLocaleString()}</Text>
                <Text style={[font.body, { fontWeight: "700" }]} numberOfLines={1}>
                  {MOOD_EMOJI[item.result.mood.primary]} {t(`moods.${item.result.mood.primary}`)} ·{" "}
                  {item.result.mood.headline}
                </Text>
                <Chip label={t(`result.vet.${item.result.vet_advice}`)} fg={level.fg} bg={level.bg} />
              </View>
            </Pressable>
          );
        }}
      />
      <BannerAdSlot />
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filter, active && styles.filterOn]}>
      <Text style={{ fontWeight: "700", color: active ? colors.primaryDark : colors.sub }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.sm, paddingBottom: space.xl },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filter: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  filterOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  empty: { ...font.body, textAlign: "center", color: colors.sub, marginTop: 40 },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    alignItems: "center",
  },
  thumb: { width: 72, height: 72, borderRadius: radius.sm },
});
