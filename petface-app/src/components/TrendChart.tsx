import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { LEVEL_COLORS, VET_LEVEL } from "@/lib/mood";
import { colors } from "@/lib/theme";
import type { HistoryItem } from "@/lib/types";

const DAYS = 30;
const RANK = { ok: 0, watch: 1, concern: 2 } as const;
type Level = keyof typeof RANK;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** One dot per day for the last 30 days, coloured by that day's most serious health level. */
export function TrendChart({ items, width }: { items: HistoryItem[]; width: number }) {
  const { t } = useTranslation();
  const byDay = new Map<string, Level>();
  for (const it of items) {
    if (!it.result.usable) continue;
    const key = dayKey(new Date(it.createdAt));
    const level = VET_LEVEL[it.result.vet_advice];
    const prev = byDay.get(key);
    if (!prev || RANK[level] > RANK[prev]) byDay.set(key, level);
  }

  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (DAYS - 1 - i));
    return byDay.get(dayKey(d)) ?? null;
  });

  if (!days.some(Boolean)) {
    return <Text style={styles.empty}>{t("history.trendEmpty")}</Text>;
  }

  const height = 70;
  const step = width / DAYS;
  const yFor = (l: Level) => height - 12 - RANK[l] * ((height - 24) / 2);

  return (
    <View style={{ gap: 8 }}>
      <Svg width={width} height={height}>
        {(["ok", "watch", "concern"] as Level[]).map((l) => (
          <Line
            key={l}
            x1={0}
            x2={width}
            y1={yFor(l)}
            y2={yFor(l)}
            stroke={colors.line}
            strokeDasharray="3 4"
          />
        ))}
        {days.map((l, i) =>
          l ? (
            <Circle
              key={i}
              cx={step * i + step / 2}
              cy={yFor(l)}
              r={Math.min(6, step / 2.2)}
              fill={LEVEL_COLORS[l].fg}
            />
          ) : null,
        )}
      </Svg>
      <View style={styles.legend}>
        {(["ok", "watch", "concern"] as Level[]).map((l) => (
          <View key={l} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: LEVEL_COLORS[l].fg }]} />
            <Text style={styles.legendText}>
              {t(`history.legend${l === "ok" ? "Ok" : l === "watch" ? "Watch" : "Concern"}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.sub, fontSize: 14, paddingVertical: 12 },
  legend: { flexDirection: "row", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.sub },
});
