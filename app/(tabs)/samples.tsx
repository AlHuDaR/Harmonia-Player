import { router } from "expo-router";
import { Page, Button, useMediaStyles } from "@/components/MediaUI";
import { Text } from "@/components/LocalizedText";
import VideoRow from "@/components/VideoRow";
import { usePlayerStore } from "@/store/playerStore";
export default function SamplesScreen() {
  const tracks = usePlayerStore((s) => s.tracks);
  const styles = useMediaStyles();
  return (
    <Page title="Samples">
      <Text style={styles.text}>Explore your recent music and videos.</Text>
      {!tracks.length && (
        <Button
          title="Discover something to play"
          onPress={() => router.navigate("/explore")}
        />
      )}
      {tracks
        .slice()
        .reverse()
        .slice(0, 20)
        .map((track) => (
          <VideoRow key={track.id} track={track} />
        ))}
    </Page>
  );
}
