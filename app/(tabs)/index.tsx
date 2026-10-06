import { router } from "expo-router";
import { Text } from "@/components/LocalizedText";
import { Page, Button, TrackCard, styles } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
export default function HomeScreen() {
  const { tracks, history } = usePlayerStore();
  const recent = history
    .map((id) => tracks.find((t) => t.id === id))
    .filter((t) => !!t);
  return (
    <Page title="Harmonia Player">
      <Button
        title="Search songs, artists, or videos"
        onPress={() => router.navigate("/explore")}
      />
      <Text style={styles.heading}>Recently played</Text>
      {!recent.length && (
        <Text style={styles.text}>Discover something to play</Text>
      )}
      {recent.slice(0, 20).map((track) => (
        <TrackCard key={track.id} track={track} list={recent} />
      ))}
    </Page>
  );
}
