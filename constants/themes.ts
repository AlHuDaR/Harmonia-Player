export const themePresets = [
  "harmonia",
  "midnight",
  "amoled",
  "ocean",
  "sunset",
] as const;
export type ThemePreset = (typeof themePresets)[number];
export const presetLabels: Record<ThemePreset, string> = {
  harmonia: "Harmonia",
  midnight: "Midnight",
  amoled: "AMOLED Black",
  ocean: "Ocean",
  sunset: "Sunset",
};
export function normalizePreset(value: unknown): ThemePreset {
  return themePresets.includes(value as ThemePreset)
    ? (value as ThemePreset)
    : "harmonia";
}
export interface ThemeTokens {
  dark: boolean;
  background: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  onAccent: string;
  selected: string;
  error: string;
  warning: string;
  scrim: string;
  mediaBackground: string;
  mediaText: string;
}
const palettes: Record<ThemePreset, { light: string[]; dark: string[] }> = {
  harmonia: {
    light: ["#f4f5fa", "#ffffff", "#e9ecf6", "#3d53ac"],
    dark: ["#101218", "#1c202b", "#2b3245", "#b5c3ff"],
  },
  midnight: {
    light: ["#f3f4fa", "#ffffff", "#e8eafa", "#51459e"],
    dark: ["#101021", "#1d1d36", "#303052", "#c7bcff"],
  },
  amoled: {
    light: ["#f5f5f5", "#ffffff", "#ebebeb", "#3d53ac"],
    dark: ["#000000", "#0c0c0c", "#202020", "#b5c3ff"],
  },
  ocean: {
    light: ["#eff7f8", "#ffffff", "#dceef0", "#006878"],
    dark: ["#08191e", "#122a31", "#20414b", "#77d6e5"],
  },
  sunset: {
    light: ["#faf4ef", "#fffcf9", "#f3e5db", "#914629"],
    dark: ["#201512", "#30221d", "#483027", "#ffbc96"],
  },
};
export function resolveTheme(
  preset: ThemePreset,
  dark: boolean,
  transparency: "subtle" | "solid" = "solid",
): ThemeTokens {
  const [background, surface, elevated, accent] =
    palettes[preset][dark ? "dark" : "light"];
  return {
    dark,
    background,
    surface: transparency === "subtle" ? `${surface}f2` : surface,
    elevated,
    accent,
    selected: elevated,
    text: dark ? "#f6f7fb" : "#181b26",
    muted: dark ? "#bbc0cc" : "#555e6c",
    border: dark ? "#515663" : "#c4cad4",
    onAccent: dark ? "#101218" : "#ffffff",
    error: dark ? "#ffaaaa" : "#ad263a",
    warning: dark ? "#f5cf81" : "#785200",
    scrim: "#00000099",
    mediaBackground: "#000000",
    mediaText: "#ffffff",
  };
}
