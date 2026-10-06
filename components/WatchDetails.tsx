import { useLocale } from "@/utils/i18n";
import { Text } from "@/components/LocalizedText";
import { useEffect, useState } from "react";
import { View, Switch, Image, Share } from "react-native";
import { Button, ActionButton, Input, styles } from "./MediaUI";
import VideoRow, { count } from "./VideoRow";
import { usePlayerStore } from "@/store/playerStore";
import {
  youtubeFormats,
  formatTrack,
  type StreamFormat,
} from "@/utils/youtube";
import { downloadTrack } from "@/utils/downloads";
import { message, type Track } from "@/types/media";
export default function WatchDetails({
  track,
  position,
  background,
  popup,
}: {
  track: Track;
  position: () => number;
  background: () => void;
  popup: () => void;
}) {
  const { t } = useLocale();
  const state = usePlayerStore();
  const [action, setAction] = useState<"play" | "download" | null>(null),
    [formats, setFormats] = useState<StreamFormat[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [add, setAdd] = useState(false),
    [name, setName] = useState(""),
    [description, setDescription] = useState(false);
  useEffect(() => {
    setAction(null);
    setError("");
    setAdd(false);
  }, [track.id]);
  useEffect(() => {
    if (!action) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    youtubeFormats(track, controller.signal)
      .then((f) => {
        if (!controller.signal.aborted)
          setFormats(f.filter((x) => action === "play" || x.downloadable));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [action, track.id]);
  const download = state.downloads.find(
    (d) =>
      (d.track.youtubeId === track.youtubeId && track.youtubeId) ||
      d.track.id === track.id,
  );
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <View style={styles.row}>
        {!!track.channelAvatar && (
          <Image
            source={{ uri: track.channelAvatar }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text raw style={styles.heading}>
            {track.artist}
          </Text>
          {track.subscribers != null && track.subscribers >= 0 && (
            <Text style={styles.text}>
              {count(track.subscribers)} subscribers
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.text}>
        {[
          track.views != null && track.views >= 0
            ? `${count(track.views)} ${t("views")}`
            : "",
          track.likes != null && track.likes >= 0
            ? `${count(track.likes)} ${t("likes")}`
            : "",
          track.uploaded,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      <View style={{ ...styles.row, justifyContent: "space-between" }}>
        <ActionButton title="Add To" onPress={() => setAdd(!add)} />
        <ActionButton title="Background" onPress={background} />
        <ActionButton title="Popup" onPress={popup} />
        <ActionButton
          title="Download"
          onPress={() =>
            track.youtubeId
              ? setAction("download")
              : downloadTrack(track).catch((e) => setError(message(e)))
          }
          disabled={!!track.localUri}
        />
      </View>
      <View style={{ ...styles.row, flexWrap: "wrap" }}>
        {!!track.youtubeId && (
          <Button title="Quality / audio" onPress={() => setAction("play")} />
        )}
        <Button
          title="Share"
          onPress={() =>
            Share.share({
              message: track.youtubeId
                ? `https://www.youtube.com/watch?v=${track.youtubeId}`
                : track.uri || track.title,
            }).catch((e) => setError(message(e)))
          }
        />
        <Button
          title="Description"
          onPress={() => setDescription(!description)}
        />
      </View>
      {description && (
        <Text selectable style={styles.text}>
          {track.description?.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&") ||
            "No description available."}
        </Text>
      )}
      {add && (
        <View style={{ gap: 8 }}>
          <Button
            title="Add to queue"
            onPress={() => {
              state.enqueue(track);
              setAdd(false);
            }}
          />
          {state.playlists.map((p) => (
            <Button
              key={p.id}
              title={p.name}
              onPress={() => {
                state.addTrack(track);
                state.addToPlaylist(p.id, track.id);
                setAdd(false);
              }}
            />
          ))}
          <Input
            placeholder="New playlist name"
            value={name}
            onChangeText={setName}
          />
          <Button
            title="Create and add"
            disabled={!name.trim()}
            onPress={() => {
              state.createPlaylist(name);
              const p = usePlayerStore.getState().playlists.at(-1)!;
              state.addTrack(track);
              state.addToPlaylist(p.id, track.id);
              setName("");
              setAdd(false);
            }}
          />
        </View>
      )}
      {action && (
        <View style={{ gap: 8 }}>
          <Text style={styles.heading}>
            {action === "play" ? "Playback quality" : "Download format"}
          </Text>
          {busy ? (
            <Text style={styles.text}>Loading formats…</Text>
          ) : (
            formats.map((f) => (
              <Button
                key={f.id}
                title={`${t(f.kind)} · ${f.label}`}
                onPress={() => {
                  const t = formatTrack(track, f);
                  setAction(null);
                  if (action === "play") state.switchFormat(t, position());
                  else downloadTrack(t).catch((e) => setError(message(e)));
                }}
              />
            ))
          )}
          {!busy && !formats.length && (
            <Text style={styles.text}>No compatible formats available.</Text>
          )}
          <Button title="Cancel" onPress={() => setAction(null)} />
        </View>
      )}
      {!!download && (
        <Text style={styles.text}>
          {download.status === "downloading"
            ? `${t("Downloading")} ${Math.round(download.progress * 100)}%`
            : download.status === "complete"
              ? "Saved for offline playback"
              : download.error}
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <View style={styles.row}>
        <Text style={{ ...styles.heading, flex: 1 }}>Up next</Text>
        <Text style={styles.text}>Auto-enqueue</Text>
        <Switch
          accessibilityLabel={t("Auto-enqueue related videos")}
          value={state.autoQueue}
          onValueChange={(autoQueue) => usePlayerStore.setState({ autoQueue })}
        />
      </View>
      {state.queue.map((t, i) => (
        <View key={`${t.id}:${i}`} style={styles.card}>
          <Text style={styles.text}>
            {i + 1}. {t.title}
          </Text>
          <View style={{ ...styles.row, flexWrap: "wrap" }}>
            <Button
              title="Move up"
              disabled={i === 0}
              onPress={() => state.moveQueued(i, -1)}
            />
            <Button title="Remove" onPress={() => state.removeQueued(i)} />
          </View>
        </View>
      ))}
      {!!state.queue.length && (
        <Button
          title="Play next"
          onPress={() => state.advance(track.related, true)}
        />
      )}
      {(track.related || []).map((t) => (
        <VideoRow key={t.id} track={t} />
      ))}
      {!track.related?.length && (
        <Text style={styles.text}>No related videos available.</Text>
      )}
      <Text
        style={{ ...styles.text, textAlign: "center", paddingVertical: 16 }}
      >
        Coded By AlHuDaR
      </Text>
    </View>
  );
}
