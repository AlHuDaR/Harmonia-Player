import { useTheme } from "@/utils/theme";
import { useState } from "react";
import { View } from "react-native";
import { useLocale } from "@/utils/i18n";
export default function SeekBar({
  value,
  duration,
  onSeek,
}: {
  value: number;
  duration: number;
  onSeek: (n: number) => void;
}) {
  const { t } = useLocale();
  const theme = useTheme();
  const [width, setWidth] = useState(1);
  const valid = Number.isFinite(duration) && duration > 0;
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={t("Seek")}
      accessibilityValue={{
        min: 0,
        max: valid ? Math.floor(duration) : 0,
        now: Math.floor(value),
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (valid)
          onSeek(
            Math.max(
              0,
              Math.min(
                duration,
                value + (e.nativeEvent.actionName === "increment" ? 10 : -10),
              ),
            ),
          );
      }}
      style={{
        height: 32,
        marginHorizontal: 16,
        justifyContent: "center",
        direction: "ltr",
      }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => valid}
      onResponderRelease={(e) => {
        if (valid)
          onSeek(
            Math.max(
              0,
              Math.min(duration, (e.nativeEvent.locationX / width) * duration),
            ),
          );
      }}
    >
      <View
        pointerEvents="none"
        style={{ height: 4, backgroundColor: theme.border, borderRadius: 3 }}
      >
        <View
          style={{
            height: 4,
            width: `${valid ? Math.max(0, Math.min(100, (value / duration) * 100)) : 0}%`,
            backgroundColor: theme.accent,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}
