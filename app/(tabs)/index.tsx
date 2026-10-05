import { useState } from "react";
import { Text } from "react-native";
import { Page, Button, Input, TrackCard, styles } from "@/components/MediaUI";
import { usePlayerStore } from "@/store/playerStore";
import { directTrack, message } from "@/types/media";
import { importMedia } from "@/utils/downloads";
export default function HomeScreen() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const tracks = usePlayerStore((s) => s.tracks);
  const history = usePlayerStore((s) => s.history);
  function open() {
    try {
      usePlayerStore.getState().setCurrentTrack(directTrack(url));
      setError("");
      setUrl("");
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <Page title="Harmonia Player">
      <Text style={styles.text}>
        Your music and videos, online and offline.
      </Text>
      <Text style={styles.heading}>Open a media URL</Text>
      <Input
        accessibilityLabel="Media URL"
        placeholder="https://example.com/music.mp3"
        value={url}
        onChangeText={setUrl}
        onSubmitEditing={open}
        keyboardType="url"
      />
      <Button title="Open URL" onPress={open} />
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
