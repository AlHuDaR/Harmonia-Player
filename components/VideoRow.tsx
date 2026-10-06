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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("Play")} ${track.title}`}
      onPress={() => usePlayerStore.getState().setCurrentTrack(track)}
      style={{
        flexDirection: "row",
        gap: 12,
        paddingVertical: 12,
        minHeight: 110,
      }}
    >
      <View
        style={{
          width: 140,
          height: 80,
          backgroundColor: "#292c38",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
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
              color: "white",
              backgroundColor: "#000b",
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
          style={{ color: "white", fontSize: 16, writingDirection: "auto" }}
        >
          {track.title}
        </Text>
        <Text raw numberOfLines={1} style={{ color: "#aeb5c8" }}>
          {track.artist}
        </Text>
        <Text style={{ color: "#aeb5c8", fontSize: 12 }}>
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
