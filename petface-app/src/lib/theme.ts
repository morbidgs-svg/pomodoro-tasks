export const colors = {
  bg: "#FFF8F2",
  card: "#FFFFFF",
  text: "#2D2420",
  sub: "#7A6B63",
  line: "#F0E4DA",
  primary: "#FF7A50",
  primaryDark: "#E8603A",
  primarySoft: "#FFE9DF",
  accent: "#5B8DEF",
  ok: "#2FA36B",
  okSoft: "#E3F5EC",
  watch: "#E6A100",
  watchSoft: "#FFF4D6",
  concern: "#E5484D",
  concernSoft: "#FDE7E8",
  premium: "#8A5CF6",
  premiumSoft: "#F1EBFF",
};

export const radius = { sm: 10, md: 16, lg: 24 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const font = {
  title: { fontSize: 26, fontWeight: "800" as const, color: colors.text },
  h2: { fontSize: 19, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 23 },
  small: { fontSize: 13, color: colors.sub, lineHeight: 18 },
};
