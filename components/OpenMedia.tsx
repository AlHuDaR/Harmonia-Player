import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Text } from "./LocalizedText";
import { Input, Button, useMediaStyles } from "./MediaUI";
import { submissionTiming } from "@/utils/playbackTiming";
import { autoPlayIntent, canAutoPlayLocally, cancelAutoPlay } from "@/utils/autoPlay";
import { youtubeTrack } from "@/utils/youtube";
import { directTrack, message } from "@/types/media";
import { usePlayerStore } from "@/store/playerStore";
import { importMedia } from "@/utils/downloads";
import { classifyLink, pastedProviderLink, type SharedLink } from "@/utils/linkProviders";
import SharedLinkCard from "./SharedLinkCard";
export default function OpenMedia() {
  const styles = useMediaStyles();
  const [show, setShow] = useState(false),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [providerLink, setProviderLink] = useState<SharedLink | null>(null);
  const submittedAt = useRef<number | undefined>(undefined);
  const pending = useRef<AbortController | null>(null);
  function cancelOpen() {
    cancelAutoPlay();
    pending.current?.abort();
    pending.current = null;
  }
  useEffect(() => cancelOpen, []);
  async function open() {
    if (pending.current) return;
    submittedAt.current = performance.now();
    const intent = autoPlayIntent();
    const timing = submissionTiming(() => performance.now(), submittedAt.current);
    const request = new AbortController();
    pending.current = request;
    setProviderLink(null);
    setBusy(true);
    setError("");
    try {
      const classified = classifyLink(url.trim());
      // Known direct files keep their existing fast path; do not add a probe request.
      const link = Platform.OS === "android" && classified.kind !== "direct"
        ? classified : pastedProviderLink(url);
      if (link) {
        setProviderLink(link);
        return;
      }
      const track = await youtubeTrack(url, request.signal);
      if (request.signal.aborted) return;
      const playable = track || directTrack(url);
      timing.mark("discovery");
      timing.attach(playable);
      await intent.start(() => canAutoPlayLocally(request.signal), () => {
        usePlayerStore.getState().setCurrentTrack(playable);
        setUrl("");
        setShow(false);
      });
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
            <SharedLinkCard autoPlay submittedAt={submittedAt.current} key={`${providerLink.url}:${submittedAt.current}`} link={providerLink} onClose={() => setProviderLink(null)} />
          )}
        </>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
