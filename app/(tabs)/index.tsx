import { router } from "expo-router";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Text } from "@/components/LocalizedText";
import {
  Page,
  Button,
  SectionHeader,
  EmptyState,
  useMediaStyles,
} from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
import { useLocale } from "@/utils/i18n";
import { useTheme } from "@/utils/theme";
export default function HomeScreen() {
  const {
    tracks,
    history,
    favorites,
    downloads,
    currentTrack,
    setExpanded,
    playList,
  } = usePlayerStore();
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 340 || fontScale > 1.3 ? 2 : 3;
  const styles = useMediaStyles();
  const theme = useTheme();
  const { t } = useLocale();
  const recent = [...new Set(history)]
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track) => !!track)
    .slice(0, 9);
  const favoriteCount = tracks.filter((track) =>
    favorites.includes(track.id),
  ).length;
  const offlineCount = downloads.filter(
    (d) => d.status === "complete" && d.track.localUri,
  ).length;
  return (
    <Page title="Home">
      <Button
        title="Search songs, artists, or videos"
        onPress={() => router.navigate("/explore")}
      />
      {currentTrack && (
        <>
          <SectionHeader title="Now playing" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Expand player")}
            onPress={() => setExpanded(true)}
            style={({ pressed }) => ({
              backgroundColor: pressed ? theme.selected : theme.surface,
              padding: 16,
              borderRadius: 18,
              gap: 6,
            })}
          >
            <Text raw numberOfLines={2} style={styles.heading}>
              {currentTrack.title}
            </Text>
            <Text raw numberOfLines={1} style={styles.text}>
              {currentTrack.artist}
            </Text>
          </Pressable>
        </>
      )}
      <SectionHeader title="Quick access" />
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Button
          title="View library"
          onPress={() => router.navigate("/library")}
        />
        <Button
          title="Downloads"
          onPress={() => router.navigate("/downloads")}
        />
      </View>
      {(favoriteCount > 0 || offlineCount > 0) && (
        <Text raw style={styles.text}>
          {t("Favorites")}: {favoriteCount} · {t("Downloaded")}: {offlineCount}
        </Text>
      )}
      <SectionHeader
        title="Recently played"
        action={recent.length ? "View recent" : undefined}
        onPress={() => router.navigate("/samples")}
      />
      {!recent.length && (
        <EmptyState
          title="Make yourself at home"
          description="Search for something you love, or import a file in Library. Your listening history will appear here."
          action="View library"
          onPress={() => router.navigate("/library")}
        />
      )}
      <View
        testID="speed-dial"
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          rowGap: 10,
          marginHorizontal: -4,
        }}
      >
        {recent.map((track, index) => (
          <Pressable
            key={track.id}
            accessibilityRole="button"
            accessibilityLabel={`${t("Play")} ${track.title}`}
            onPress={() => playList(recent, index)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              width: `${100 / columns}%`,
              paddingHorizontal: 4,
              minHeight: 86,
              gap: 5,
            })}
          >
            <View
              style={{
                width: "100%",
                aspectRatio: 1.45,
                backgroundColor: theme.surface,
                borderRadius: 9,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {track.cover ? (
                <Image
                  source={{ uri: track.cover }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <MaterialIcons
                  name="music-note"
                  size={24}
                  color={theme.muted}
                />
              )}
            </View>
            <Text
              raw
              numberOfLines={2}
              style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}
            >
              {track.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </Page>
  );
}
