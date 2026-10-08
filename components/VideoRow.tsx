import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/utils/theme";
import { useLocale } from "@/utils/i18n";
import { Text } from "@/components/LocalizedText";
import { View, Image, Pressable } from "react-native";
import { usePlayerStore } from "@/store/playerStore";
import type { Track } from "@/types/media";
export const count = (n?: number) =>
  n == null || n < 0
    ? ""
    : Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
export const duration = (n?: number) =>
  n == null || n < 0
    ? ""
    : [
        Math.floor(n / 3600) || null,
        (Math.floor(n / 60) % 60).toString().padStart(n >= 3600 ? 2 : 1, "0"),
        Math.floor(n % 60)
          .toString()
          .padStart(2, "0"),
      ]
        .filter((x) => x !== null)
        .join(":");
export default function VideoRow({ track }: { track: Track }) {
  const { t } = useLocale();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("Play")} ${track.title}`}
      onPress={() => usePlayerStore.getState().setCurrentTrack(track)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        flexDirection: "row",
        gap: 12,
        paddingVertical: 12,
        minHeight: 84,
      })}
    >
      <View
        style={{
          width: 110,
          height: 66,
          backgroundColor: theme.surface,
          borderRadius: 8,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!track.cover && <MaterialIcons name={track.kind === "audio" ? "music-note" : "smart-display"} size={28} color={theme.muted} />}
        {!!track.cover && (
          <Image
            source={{ uri: track.cover }}
            style={{ width: "100%", height: "100%" }}
          />
        )}
        {!!duration(track.duration) && (
          <Text
            style={{
              position: "absolute",
              bottom: 3,
              right: 3,
              color: theme.mediaText,
              backgroundColor: theme.scrim,
              paddingHorizontal: 4,
            }}
          >
            {duration(track.duration)}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text
          raw
          numberOfLines={2}
          style={{ color: theme.text, fontSize: 14, writingDirection: "auto" }}
        >
          {track.title}
        </Text>
        <Text raw numberOfLines={1} style={{ color: theme.muted }}>
          {track.artist}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>
          {[
            track.views != null && track.views >= 0
              ? `${count(track.views)} ${t("views")}`
              : "",
            track.uploaded,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
    </Pressable>
  );
}
