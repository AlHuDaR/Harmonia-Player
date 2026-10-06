import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { Page, Input, Button, TrackCard, styles } from "@/components/MediaUI";
import { searchYouTube } from "@/utils/youtube";
import { message, type Track } from "@/types/media";
export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [nextPage, setNextPage] = useState<string>();
  const [activeQuery, setActiveQuery] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function search(more = false) {
    const term = more ? activeQuery : query.trim();
    if (!term || (more && !nextPage)) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const page = await searchYouTube(
        term,
        more ? nextPage : undefined,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setResults((previous) =>
          more
            ? [
                ...previous,
                ...page.tracks.filter(
                  (t) => !previous.some((p) => p.id === t.id),
                ),
              ]
            : page.tracks,
        );
        setNextPage(page.nextPage);
        setActiveQuery(term);
        if (!more && !page.tracks.length) setError("No results found.");
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
        Search YouTube directly on your Android phone. No API key or server
        setup.
      </Text>
      <Input
        accessibilityLabel="Search query"
        placeholder="Search songs, artists, or videos"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => search()}
      />
      <Button title="Search" onPress={() => search()} disabled={busy} />
      {busy && <ActivityIndicator color="#b7c4ff" />}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {results.map((track) => (
        <TrackCard key={track.id} track={track} />
      ))}
      {!!nextPage && (
        <Button
          title="Load more"
          onPress={() => search(true)}
          disabled={busy}
        />
      )}
    </Page>
  );
}
