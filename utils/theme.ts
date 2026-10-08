import { useColorScheme } from "react-native";
import { usePlayerStore } from "@/store/playerStore";
import { normalizePreset, resolveTheme } from "@/constants/themes";
export function useTheme() {
  const scheme = useColorScheme();
  const { theme, transparency, preset } = usePlayerStore((s) => s.settings);
  const dark = theme === "dark" || (theme !== "light" && scheme === "dark");
  return resolveTheme(normalizePreset(preset), dark, transparency);
}
