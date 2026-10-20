import { useEffect, useRef, useState } from "react";
import { Linking, NativeModules, Platform, View } from "react-native";
import { Text } from "./LocalizedText";
import { Button, useMediaStyles } from "./MediaUI";
import { directTrack, message, type Track } from "@/types/media";
import {
  formatTrack,
  youtubeFormats,
  youtubeTrack,
  type StreamFormat,
} from "@/utils/youtube";
import { classifyLink, type SharedLink } from "@/utils/linkProviders";
import { downloadTrack } from "@/utils/downloads";
import { usePlayerStore } from "@/store/playerStore";

export default function SharedLinkCard({
  link,
  onClose,
}: {
  link: SharedLink;
  onClose: () => void;
}) {
  const styles = useMediaStyles();
  const [track, setTrack] = useState<Track | null>(null);
  const [formats, setFormats] = useState<StreamFormat[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const alive = useRef(true);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      operation.current?.abort();
    };
  }, []);
  async function act(
    action: "play" | "audio" | "download",
    format?: StreamFormat,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    operation.current = controller;
    try {
      const media =
        track ||
        (link.kind === "youtube"
          ? await youtubeTrack(link.url, controller.signal)
          : directTrack(link.url));
      if (!media) throw new Error("No playable media source is available.");
      if (!alive.current || controller.signal.aborted) return;
      setTrack(media);
      if (action === "download" && link.kind === "youtube" && !format) {
        const options = await youtubeFormats(media, controller.signal);
        if (!options.some((f) => f.downloadable))
          throw new Error("No downloadable formats available.");
        if (alive.current) setFormats(options.filter((f) => f.downloadable));
        return;
      }
      let selected = format ? formatTrack(media, format) : media;
      if (action === "audio") {
        const options = await youtubeFormats(media, controller.signal);
        const audio = options.find((f) => f.kind === "audio");
        if (!audio) throw new Error("No compatible audio format available.");
        selected = formatTrack(media, audio);
      }
      if (!alive.current || controller.signal.aborted) return;
      if (action === "download") await downloadTrack(selected);
      else {
        usePlayerStore.getState().setCurrentTrack(selected);
        onClose();
      }
    } catch (e) {
      if (alive.current && !controller.signal.aborted) setError(message(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <Text raw style={styles.text}>
        {link.provider}
      </Text>
      <Text raw style={styles.text}>
        {track?.title || link.url}
      </Text>
      <Text style={styles.text}>
        {link.kind === "web"
          ? "Playback and download are not supported for this page. Save the link or open the original source."
          : "Media availability and download formats depend on the source. Only use media you are authorized to access."}
      </Text>
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {busy && (
        <Text accessibilityRole="alert" style={styles.text}>
          Working…
        </Text>
      )}
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        {link.actions.includes("play") && (
          <Button title="Play" disabled={busy} onPress={() => act("play")} />
        )}
        {link.actions.includes("audio") && (
          <Button
            title="Audio Only"
            disabled={busy}
            onPress={() => act("audio")}
          />
        )}
        {link.actions.includes("download") && (
          <Button
            title="Download"
            disabled={busy}
            onPress={() => act("download")}
          />
        )}
        <Button
          title={saved ? "Link saved" : "Save Link"}
          disabled={saved}
          onPress={() => {
            const checked = classifyLink(link.url);
            usePlayerStore
              .getState()
              .saveLink({ url: checked.url, provider: checked.provider });
            setSaved(true);
          }}
        />
        <Button
          title="Open in Browser"
          onPress={() => {
            (Platform.OS === "android" &&
            NativeModules.HarmoniaIntents?.openBrowser
              ? NativeModules.HarmoniaIntents.openBrowser(
                  classifyLink(link.url).url,
                )
              : Linking.openURL(classifyLink(link.url).url)
            ).catch(() => {
              if (alive.current) setError("Could not open the browser.");
            });
          }}
        />
        <Button title="Close" onPress={onClose} />
      </View>
      {formats.map((format) => (
        <Button
          raw
          key={format.id}
          title={format.label}
          disabled={busy}
          onPress={() => act("download", format)}
        />
      ))}
    </View>
  );
}
