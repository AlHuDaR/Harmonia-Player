import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./LocalizedText";
import { Input, Button, useMediaStyles } from "./MediaUI";
import { youtubeTrack } from "@/utils/youtube";
import { directTrack, message } from "@/types/media";
import { usePlayerStore } from "@/store/playerStore";
import { importMedia } from "@/utils/downloads";
import { pastedProviderLink, type SharedLink } from "@/utils/linkProviders";
import SharedLinkCard from "./SharedLinkCard";
export default function OpenMedia() {
  const styles = useMediaStyles();
  const [show, setShow] = useState(false),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [providerLink, setProviderLink] = useState<SharedLink | null>(null);
  const pending = useRef<AbortController | null>(null);
  function cancelOpen() {
    pending.current?.abort();
    pending.current = null;
  }
  useEffect(() => cancelOpen, []);
  async function open() {
    if (pending.current) return;
    const request = new AbortController();
    pending.current = request;
    setProviderLink(null);
    setBusy(true);
    setError("");
    try {
      const link = pastedProviderLink(url);
      if (link) {
        setProviderLink(link);
        return;
      }
      const track = await youtubeTrack(url, request.signal);
      if (request.signal.aborted) return;
      usePlayerStore.getState().setCurrentTrack(track || directTrack(url));
      setUrl("");
      setShow(false);
    } catch (e) {
      if (!request.signal.aborted) setError(message(e));
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Button title="Open link" expanded={show} onPress={() => {
          if (show) {
            cancelOpen();
            setBusy(false);
            setProviderLink(null);
          }
          setShow(!show);
        }} />
        <Button
          title="Import local audio or video"
          onPress={() => importMedia().catch((e) => setError(message(e)))}
        />
      </View>
      {show && (
        <>
          <Input
            accessibilityLabel="Media URL"
            placeholder="Media or social link"
            value={url}
            onChangeText={(value) => {
              cancelOpen();
              setBusy(false);
              setProviderLink(null);
              setUrl(value);
            }}
            onSubmitEditing={open}
          />
          <Button
            title={busy ? "Opening…" : "Open URL"}
            onPress={open}
            disabled={busy}
          />
          {providerLink && (
            <SharedLinkCard key={providerLink.url} link={providerLink} onClose={() => setProviderLink(null)} />
          )}
        </>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
