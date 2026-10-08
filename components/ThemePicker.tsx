import { Pressable, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Text } from "./LocalizedText";
import { useLocale } from "@/utils/i18n";
import { useTheme } from "@/utils/theme";
import { usePlayerStore } from "@/store/playerStore";
import { presetLabels, resolveTheme, themePresets } from "@/constants/themes";
export default function ThemePicker() {
  const theme = useTheme();
  const { t } = useLocale();
  const preset = usePlayerStore((s) => s.settings.preset);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {themePresets.map((value) => {
        const preview = resolveTheme(value, theme.dark);
        const selected = preset === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={t(presetLabels[value])}
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            onPress={() =>
              usePlayerStore.getState().updateSettings({ preset: value })
            }
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: "44%",
              minWidth: 100,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: selected ? theme.accent : theme.border,
              padding: 10,
              gap: 8,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View
              accessible={false}
              style={{
                height: 58,
                backgroundColor: preview.background,
                borderRadius: 8,
                padding: 8,
                gap: 6,
              }}
            >
              <View
                style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: preview.accent,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: preview.text,
                  }}
                />
              </View>
              <View
                style={{
                  height: 10,
                  backgroundColor: preview.elevated,
                  borderRadius: 5,
                }}
              />
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Text
                style={{
                  color: theme.text,
                  flex: 1,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {presetLabels[value]}
              </Text>
              {selected && (
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color={theme.accent}
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
