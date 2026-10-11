import { View } from "react-native";

/** Simple bar chart of a recording's loudness envelope (values 0..1). */
export function SoundBars({
  values,
  height,
  color,
  gap = 2,
}: {
  values: number[];
  height: number;
  color: string;
  gap?: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height, gap }}>
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(3, v * height),
            borderRadius: 3,
            backgroundColor: color,
            opacity: 0.35 + 0.65 * v,
          }}
        />
      ))}
    </View>
  );
}
