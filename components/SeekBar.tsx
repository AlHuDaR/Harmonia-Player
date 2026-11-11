import { Text } from "@/components/LocalizedText";
import { useTheme } from "@/utils/theme";
import { useRef, useState } from "react";
import { View } from "react-native";
import { seekPosition, type LoopRange } from "@/utils/playbackControls";
import { useLocale } from "@/utils/i18n";
export default function SeekBar({
  value,
  duration,
  onSeek,
  disabled = false,
  loop,
}: {
  value: number;
  duration: number;
  onSeek: (n: number) => void;
  disabled?: boolean;
  loop?: LoopRange | null;
}) {
  const { t } = useLocale();
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const gesture = useRef<{ origin: number; duration: number } | null>(null);
  const displayed = disabled ? value : preview ?? value;
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const valid = hasDuration && width > 0 && !disabled;
  const percent = (time: number) => seekPosition(time, duration, 100);
  const cancel = () => {
    gesture.current = null;
    setPreview(null);
  };
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={t("Seek")}
      accessibilityState={{ disabled: !valid }}
      accessibilityValue={{
        min: 0,
        max: hasDuration ? Math.floor(duration) : 0,
        now: hasDuration ? Math.floor(seekPosition(displayed, duration, duration)) : 0,
      }}
      accessibilityActions={
        valid ? [{ name: "increment" }, { name: "decrement" }] : []
      }
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
      onResponderGrant={({ nativeEvent }) => {
        gesture.current = { origin: nativeEvent.pageX - nativeEvent.locationX, duration };
        setPreview(seekPosition(nativeEvent.locationX, width, duration));
      }}
      onResponderMove={({ nativeEvent }) => {
        if (valid && gesture.current)
          setPreview(seekPosition(nativeEvent.pageX - gesture.current.origin, width, duration));
      }}
      onResponderRelease={({ nativeEvent }) => {
        const drag = gesture.current;
        cancel();
        if (valid && drag?.duration === duration)
          onSeek(seekPosition(nativeEvent.pageX - drag.origin, width, duration));
      }}
      onResponderTerminate={cancel}
    >
      <View
        pointerEvents="none"
        style={{ height: 4, backgroundColor: theme.border, borderRadius: 3 }}
      >
        <View
          style={{
            height: 4,
            width: `${percent(displayed)}%`,
            backgroundColor: theme.accent,
            borderRadius: 3,
          }}
        />
        {loop && hasDuration && (
          <View style={{
            position: "absolute",
            top: -2,
            height: 8,
            left: `${percent(loop.start)}%`,
            width: `${percent(loop.end) - percent(loop.start)}%`,
            borderColor: theme.text,
            borderWidth: 1,
            borderRadius: 3,
          }} />
        )}
        {hasDuration && (
          <View style={{
            position: "absolute",
            top: -4,
            left: `${percent(displayed)}%`,
            marginLeft: -6,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: theme.accent,
          }} />
        )}
      </View>
      {preview !== null && valid && (
        <View pointerEvents="none" style={{ position: "absolute", bottom: 26, alignSelf: "center", backgroundColor: theme.surface, paddingHorizontal: 8, borderRadius: 6 }}>
          <Text raw style={{ color: theme.text }}>{Math.floor(preview / 60)}:{String(Math.floor(preview % 60)).padStart(2, "0")}</Text>
        </View>
      )}
    </View>
  );
}
