import { useColorScheme } from "react-native";
import { usePlayerStore } from "@/store/playerStore";
export function useTheme() {
  const scheme = useColorScheme();
  const { theme, transparency } = usePlayerStore((s) => s.settings);
  const dark = theme === "dark" || (theme !== "light" && scheme === "dark");
  const solid = transparency === "solid";
  return {
    dark,
    background: dark ? "#101218" : "#f4f5f8",
    surface: dark
      ? solid
        ? "#20232d"
        : "rgba(32,35,45,0.90)"
      : solid
        ? "#ffffff"
        : "rgba(255,255,255,0.88)",
    text: dark ? "#f6f7fb" : "#181b26",
    muted: dark ? "#b4bacb" : "#555e73",
    border: dark ? "#343a4b" : "#d6dbe6",
    accent: dark ? "#a9b9ff" : "#3d53ac",
    error: dark ? "#ffaaaa" : "#ad263a",
  };
}
