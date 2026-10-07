import { useEffect, useRef, useState } from "react";
import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  View,
  AppState,
} from "react-native";
import { incomingVideo } from "@/utils/incomingLinks";
import { youtubeTrack } from "@/utils/youtube";
import { message } from "@/types/media";
import { usePlayerStore } from "@/store/playerStore";
import { Button, styles } from "./MediaUI";
import { Text } from "./LocalizedText";
export default function IncomingLinks() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const module = NativeModules.HarmoniaIntents;
    if (Platform.OS !== "android" || !module) return;
    let mounted = true;
    const seen = new Set<string>();
    async function receive(value: { text: string; token: string } | null) {
      if (!mounted || !value || seen.has(value.token)) return;
      seen.add(value.token);
      if (seen.size > 30) seen.delete(seen.values().next().value!);
      // Ignore our own launcher/scheme links. Shared external text must contain a valid YouTube video.
      if (value.text.startsWith("harmonia:")) return;
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      const url = incomingVideo(value.text);
      if (!url) {
        setBusy(false);
        setError("No supported YouTube video link was found.");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const track = await youtubeTrack(url, current.signal);
        if (mounted && !current.signal.aborted && track)
          usePlayerStore.getState().setCurrentTrack(track);
      } catch (e) {
        if (mounted && !current.signal.aborted) setError(message(e));
      } finally {
        if (mounted && !current.signal.aborted) setBusy(false);
      }
    }
    const listener = new NativeEventEmitter(module).addListener(
      "HarmoniaLink",
      receive,
    );
    const pending = () =>
      module
        .getPending()
        .then(receive)
        .catch(() => {});
    pending();
    const active = AppState.addEventListener("change", (s) => {
      if (s === "active") pending();
    });
    return () => {
      mounted = false;
      controller.current?.abort();
      listener.remove();
      active.remove();
    };
  }, []);
  return busy || error ? (
    <View style={{ backgroundColor: "#202020", padding: 12 }}>
      <Text
        accessibilityRole="alert"
        style={error ? styles.error : styles.text}
      >
        {busy ? "Opening…" : error}
      </Text>
      <Button
        title="Close"
        onPress={() => {
          controller.current?.abort();
          setBusy(false);
          setError("");
        }}
      />
    </View>
  ) : null;
}
