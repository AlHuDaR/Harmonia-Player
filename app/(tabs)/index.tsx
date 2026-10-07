import { router } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Text } from "@/components/LocalizedText";
import { Page, Button, useMediaStyles } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
import { useLocale } from "@/utils/i18n";
import { useTheme } from "@/utils/theme";
export default function HomeScreen() {
  const { tracks, history, playList } = usePlayerStore();
  const styles = useMediaStyles();
  const theme = useTheme();
  const { t } = useLocale();
  const ids = [
    ...new Set([
      ...history,
      ...tracks
        .slice()
        .reverse()
        .map((track) => track.id),
    ]),
  ];
  const recent = ids
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track) => !!track)
    .slice(0, 9);
  return (
    <Page title="Home">
      <Button
        title="Search songs, artists, or videos"
        onPress={() => router.navigate("/explore")}
      />
      <Text style={styles.heading}>Speed dial</Text>
      {!recent.length && (
        <Text style={styles.text}>Discover something to play</Text>
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
            style={{
              width: "33.333333%",
              paddingHorizontal: 4,
              minHeight: 86,
              gap: 5,
            }}
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
              style={{ color: theme.text, fontSize: 11, fontWeight: "600" }}
            >
              {track.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </Page>
  );
}
