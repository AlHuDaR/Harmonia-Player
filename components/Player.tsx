import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  PermissionsAndroid,
  StyleSheet,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { usePlayerStore } from "@/store/playerStore";
import { resolveSource, type MediaSource } from "@/utils/youtube";
import { message, type Track } from "@/types/media";

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
export default function Player() {
  const track = usePlayerStore((s) => s.currentTrack);
  return track ? <ActivePlayer key={track.id} track={track} /> : null;
}
function ActivePlayer({ track }: { track: Track }) {
  const [uri, setUri] = useState<MediaSource | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setUri(null);
    setError("");
    resolveSource(track, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setUri(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      });
    return () => controller.abort();
  }, [track, retry]);
  if (!uri)
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{track.title}</Text>
        <Text style={styles.muted}>{error || "Loading media…"}</Text>
        <View style={styles.row}>
          {!!error && (
            <Pressable onPress={() => setRetry((x) => x + 1)}>
              <Text style={styles.button}>Retry</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityLabel="Close player"
            onPress={() => usePlayerStore.getState().setCurrentTrack(null)}
          >
            <Text style={styles.button}>Close</Text>
          </Pressable>
        </View>
      </View>
    );
  return (
    <MediaEngine
      key={`${uri.uri}:${retry}`}
      track={track}
      uri={uri}
      onRetry={() => setRetry((x) => x + 1)}
    />
  );
}
function MediaEngine({
  track,
  uri,
  onRetry,
}: {
  track: Track;
  uri: MediaSource;
  onRetry: () => void;
}) {
  const settings = usePlayerStore((s) => s.settings);
  const favorite = usePlayerStore((s) => s.favorites.includes(track.id));
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(track.kind === "video");
  const view = useRef<VideoView>(null);
  const player = useVideoPlayer(
    {
      uri: uri.uri,
      headers: uri.headers,
      metadata: {
        title: track.title,
        artist: track.artist,
        artwork: track.cover,
      },
    },
    (p) => {
      p.timeUpdateEventInterval = 1;
      p.audioMixingMode = "doNotMix";
    },
  );
  useEffect(() => {
    player.staysActiveInBackground = settings.background;
    player.showNowPlayingNotification = settings.background;
  }, [player, settings.background]);
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      Number(Platform.Version) >= 33 &&
      settings.background
    ) {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      ).catch(() => {});
    }
  }, [settings.background]);
  useEffect(() => {
    setLoading(player.status !== "readyToPlay");
    setPlaying(player.playing);
    setDuration(player.duration);
    const status = player.addListener("statusChange", (e) => {
      setLoading(e.status === "loading");
      if (e.status === "error")
        setError(
          e.error?.message || "Playback failed. Retry or check the media URL.",
        );
      if (e.status === "readyToPlay") setDuration(player.duration);
    });
    const playback = player.addListener("playingChange", (e) =>
      setPlaying(e.isPlaying),
    );
    const time = player.addListener("timeUpdate", (e) => {
      setPosition(e.currentTime);
      setDuration(player.duration);
    });
    const end = player.addListener("playToEnd", () => setPlaying(false));
    return () => {
      status.remove();
      playback.remove();
      time.remove();
      end.remove();
    };
  }, [player]);
  useEffect(() => {
    // Initialize the view from the source rather than replacing it after mount.
    // On web, an imperative replace races React's src update and aborts play().
    player.play();
    return () => {
      if (Platform.OS === "web") {
        player.pause();
        player.timeUpdateEventInterval = 0;
      }
    };
  }, [player]);
  function seek(delta: number) {
    player.currentTime = Math.max(
      0,
      Math.min(
        player.duration || Number.MAX_SAFE_INTEGER,
        player.currentTime + delta,
      ),
    );
  }
  return (
    <View style={styles.container}>
      <VideoView
        ref={view}
        player={player}
        style={{ height: expanded ? 180 : 1 }}
        nativeControls={expanded}
        allowsFullscreen
        allowsPictureInPicture
        startsPictureInPictureAutomatically={expanded && settings.autoPip}
        contentFit="contain"
      />
      <View style={styles.row}>
        <Pressable
          accessibilityLabel="Expand player"
          style={{ flex: 1 }}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.muted}>{track.artist}{track.formatLabel ? ` · ${track.formatLabel}` : ""}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={favorite ? "Remove favorite" : "Favorite"}
          onPress={() => usePlayerStore.getState().toggleFavorite(track.id)}
        >
          <Text style={styles.button}>{favorite ? "♥" : "♡"}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Close player"
          onPress={() => usePlayerStore.getState().setCurrentTrack(null)}
        >
          <Text style={styles.button}>×</Text>
        </Pressable>
      </View>
      {error ? (
        <View style={styles.row}>
          <Text accessibilityRole="alert" style={{ color: "#ff9c9c", flex: 1 }}>
            {error}
          </Text>
          <Pressable onPress={onRetry}>
            <Text style={styles.button}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.row}>
          <Pressable
            accessibilityLabel="Seek back 10 seconds"
            onPress={() => seek(-10)}
          >
            <Text style={styles.button}>−10s</Text>
          </Pressable>
          <Pressable
            disabled={loading}
            accessibilityLabel={playing ? "Pause" : "Play"}
            onPress={() => (playing ? player.pause() : player.play())}
          >
            <Text style={styles.button}>
              {loading ? "Loading…" : playing ? "Pause" : "Play"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Seek forward 10 seconds"
            onPress={() => seek(10)}
          >
            <Text style={styles.button}>+10s</Text>
          </Pressable>
          <Text style={styles.muted}>
            {clock(position)} / {clock(duration)}
          </Text>
          {expanded && (
            <Pressable
              accessibilityLabel="Picture in Picture"
              onPress={() =>
                view.current
                  ?.startPictureInPicture()
                  .catch((e) => setActionError(message(e)))
              }
            >
              <Text style={styles.button}>PiP</Text>
            </Pressable>
          )}
        </View>
      )}
      {!!actionError && (
        <Text accessibilityRole="alert" style={{ color: "#ff9c9c" }}>
          {actionError}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { backgroundColor: "#191b25", padding: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "white", fontWeight: "600", fontSize: 15 },
  muted: { color: "#aab0c5", fontSize: 12 },
  button: { color: "#b7c4ff", padding: 8, fontSize: 15 },
});
