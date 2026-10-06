import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { Page, Input, Button, TrackCard, styles } from "@/components/MediaUI";
import { searchYouTubeMusic } from "@/utils/youtube";
import { message, type Track } from "@/types/media";
export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function search() {
    if (!query.trim()) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const tracks = await searchYouTubeMusic(query.trim(), controller.signal);
      if (!controller.signal.aborted) {
        setResults(tracks);
        if (!tracks.length) setError("No results found.");
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(message(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <Page title="Search">
      <Text style={styles.text}>
        Search YouTube metadata. Configure your API key and playback resolver in
        Settings.
      </Text>
      <Input
        accessibilityLabel="Search query"
        placeholder="Search songs, artists, or videos"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={search}
      />
      <Button title="Search" onPress={search} disabled={busy} />
      {busy && <ActivityIndicator color="#b7c4ff" />}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {results.map((track) => (
        <TrackCard key={track.id} track={track} />
      ))}
    </Page>
  );
}
