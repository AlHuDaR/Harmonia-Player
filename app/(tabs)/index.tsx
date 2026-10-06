import { useState } from "react";
import { Text } from "react-native";
import { Page, Button, Input, TrackCard, styles } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
import { directTrack, message } from "@/types/media";
import { youtubeTrack } from "@/utils/youtube";
import { importMedia } from "@/utils/downloads";
export default function HomeScreen() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const tracks = usePlayerStore((s) => s.tracks);
  const history = usePlayerStore((s) => s.history);
  const [opening, setOpening] = useState(false);
  async function open() {
    setOpening(true);
    try {
      usePlayerStore
        .getState()
        .setCurrentTrack((await youtubeTrack(url)) || directTrack(url));
      setError("");
      setUrl("");
    } catch (e) {
      setError(message(e));
    } finally {
      setOpening(false);
    }
  }
  return (
    <Page title="Harmonia Player">
      <Text style={styles.text}>
        Your music and videos, online and offline.
      </Text>
      <Text style={styles.heading}>Open a YouTube or media URL</Text>
      <Input
        accessibilityLabel="Media URL"
        placeholder="YouTube link or direct media URL"
        value={url}
        onChangeText={setUrl}
        onSubmitEditing={open}
        keyboardType="url"
      />
      <Button
        title={opening ? "Opening…" : "Open URL"}
        onPress={open}
        disabled={opening}
      />
      <Button
        title="Import local audio or video"
        onPress={() => {
          setError("");
          importMedia().catch((e) => setError(message(e)));
        }}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Text style={styles.heading}>Recently played</Text>
      {!history.length && (
        <Text style={styles.text}>
          Play a file or stream to start your listening history.
        </Text>
      )}
      {history
        .slice(0, 10)
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t) => !!t)
        .map((track) => (
          <TrackCard key={track.id} track={track} />
        ))}
    </Page>
  );
}
