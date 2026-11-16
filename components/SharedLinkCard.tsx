import { useLocale } from "@/utils/i18n";
import { useEffect, useRef, useState } from "react";
import { Linking, NativeModules, Platform, View } from "react-native";
import { Text } from "./LocalizedText";
import { Button, useMediaStyles } from "./MediaUI";
import { message } from "@/types/media";
import { classifyLink, type SharedLink } from "@/utils/linkProviders";
import {
  discoverMedia,
  autoPlayChoice,
  choicesFor,
  policy,
  type Discovery,
  type MediaChoice,
  type MediaAction,
} from "@/utils/mediaDiscovery";
import { downloadTrack } from "@/utils/downloads";
import { submissionTiming } from "@/utils/playbackTiming";
import { autoPlayIntent, canAutoPlayLocally } from "@/utils/autoPlay";
import { usePlayerStore } from "@/store/playerStore";
const actions: [MediaAction, string][] = [
  ["play-video", "Play Video"],
  ["play-audio", "Audio Only"],
  ["download-video", "Download Video"],
  ["download-audio", "Download Audio"],
];
export default function SharedLinkCard({
  link,
  onClose,
  autoPlay = false,
  submittedAt,
}: {
  link: SharedLink;
  autoPlay?: boolean;
  submittedAt?: number;
  onClose: () => void;
}) {
  const styles = useMediaStyles();
  const { t } = useLocale();
  const [media, setMedia] = useState<Discovery | null>(null);
  const [choices, setChoices] = useState<MediaChoice[]>([]);
  const [action, setAction] = useState<MediaAction>("play-video");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const alive = useRef(true);
  const stop = useRef(() => {});
  const p = policy(link);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    const intent = autoPlay && attempt === 0 ? autoPlayIntent() : null;
    stop.current = () => { intent?.cancel(); controller.abort(); };
    const timing = submissionTiming(() => performance.now(), attempt === 0 ? submittedAt : undefined);
    const initialTrack = usePlayerStore.getState().currentTrack;
    const unsubscribe = usePlayerStore.subscribe((state) => {
      if (state.currentTrack !== initialTrack) intent?.cancel();
    });
    setMedia(null);
    setChoices([]);
    setError("");
    setSaved(false);
    setBusy(false);
    if (p.adapter !== "unavailable") {
      setBusy(true);
      discoverMedia(link, controller.signal)
        .then((value) => {
          if (controller.signal.aborted) return;
          timing.mark("discovery");
          value.choices.forEach((choice) => timing.attach(choice.track));
          setMedia(value);
          const choice = autoPlayChoice(value);
          if (choice && intent) void intent.start(() => canAutoPlayLocally(controller.signal), () => {
            usePlayerStore.getState().setCurrentTrack(choice.track);
            close.current();
          }).catch(() => {});
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(message(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }
    return () => {
      intent?.cancel();
      unsubscribe();
      alive.current = false;
      controller.abort();
    };
  }, [link.url, attempt, autoPlay, submittedAt]);
  async function select(choice: MediaChoice, selectedAction: MediaAction) {
    stop.current();
    setBusy(true);
    setError("");
    try {
      if (selectedAction.startsWith("download"))
        await downloadTrack(choice.track);
      else {
        usePlayerStore.getState().setCurrentTrack(choice.track);
        onClose();
      }
      if (alive.current) setChoices([]);
    } catch (e) {
      if (alive.current) setError(message(e));
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
        {media?.title || link.url}
      </Text>
      {p.adapter === "unavailable" && (
        <Text style={styles.text}>{p.reason}</Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {busy && (
        <Text accessibilityRole="alert" style={styles.text}>
          {media ? "Working…" : "Discovering available media…"}
        </Text>
      )}
      {media && !media.choices.some((choice) => choice.kind === "audio") && (
        <Text style={styles.text}>This source provides no separate audio stream.</Text>
      )}
      {media && !media.choices.some((choice) => choice.downloadable) && (
        <Text style={styles.text}>Available streams support playback only. Offline download is unavailable.</Text>
      )}
      <View style={[styles.row, { flexWrap: "wrap" }]}>

        {actions.map(([key, label]) => {
          const options = choicesFor(media, key);
          return (
            <Button
              key={key}
              title={label}
              disabled={busy || !options.length}
              onPress={() => {
                stop.current();
                setAction(key);
                if (options.length === 1) select(options[0], key);
                else setChoices(options);
              }}
            />
          );
        })}
        {p.adapter !== "unavailable" && !busy && (
          <Button
            title="Refresh formats"
            onPress={() => setAttempt((x) => x + 1)}
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
        <Button title="Close" onPress={() => { stop.current(); onClose(); }} />
      </View>
      {choices.map((choice) => (
        <Button
          raw
          key={choice.id}
          title={t(choice.label)}
          disabled={busy}
          onPress={() => select(choice, action)}
        />
      ))}
    </View>
  );
}
