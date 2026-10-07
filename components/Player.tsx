import { IconButton } from "./MediaUI";
import { useLocale } from "@/utils/i18n";
import SeekBar from "./SeekBar";
import { Text } from "@/components/LocalizedText";
import WatchDetails from "./WatchDetails";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Platform,
  PermissionsAndroid,
  StyleSheet,
  ScrollView,
  BackHandler,
  useWindowDimensions,
  Image,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { usePlayerStore } from "@/store/playerStore";
import {
  resolveSource,
  videoDetails,
  youtubeFormats,
  formatTrack,
  type MediaSource,
} from "@/utils/youtube";
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
  const { t } = useLocale();
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
        <Text raw style={styles.title}>
          {track.title}
        </Text>
        <Text style={styles.muted}>{error || "Loading media…"}</Text>
        <View style={styles.row}>
          {!!error && (
            <Pressable onPress={() => setRetry((x) => x + 1)}>
              <Text style={styles.button}>Retry</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityLabel={t("Close player")}
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
  const { t } = useLocale();
  const transport = usePlayerStore();
  const [audioMode, setAudioMode] = useState(track.kind === "audio");
  const [switching, setSwitching] = useState(false);
  const settings = usePlayerStore((s) => s.settings);
  const favorite = usePlayerStore((s) => s.favorites.includes(track.id));
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const expanded = usePlayerStore((s) => s.expanded);
  const setExpanded = usePlayerStore((s) => s.setExpanded);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [details, setDetails] = useState(track);
  const related = useRef<Track[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    videoDetails(track, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setDetails({ ...track, ...value, id: track.id });
          related.current = value.related || [];
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [track]);
  useEffect(() => {
    if (!expanded) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      setExpanded(false);
      return true;
    });
    return () => listener.remove();
  }, [expanded]);
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
    let restored = false;
    const restore = () => {
      if (restored || player.status !== "readyToPlay") return;
      restored = true;
      const position = usePlayerStore.getState().position;
      if (position > 0)
        player.currentTime = Math.min(position, player.duration || position);
    };
    restore();
    const status = player.addListener("statusChange", (e) => {
      restore();
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
    const end = player.addListener("playToEnd", () => {
      const s = usePlayerStore.getState();
      if (s.repeat === "one") {
        player.currentTime = 0;
        player.play();
        return;
      }
      setPlaying(false);
      s.advance(related.current);
    });
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
  async function changeMode(audio: boolean) {
    if (switching) return;
    if (!track.youtubeId || track.localUri) {
      setAudioMode(audio);
      return;
    }
    setSwitching(true);
    setActionError("");
    try {
      const formats = await youtubeFormats(track);
      const kind = audio ? "audio" : "video";
      const format = formats.find((f) => f.kind === kind);
      if (!format) throw new Error("No compatible formats available.");
      usePlayerStore
        .getState()
        .switchFormat(formatTrack(track, format), player.currentTime);
    } catch (e) {
      setActionError(message(e));
    } finally {
      setSwitching(false);
    }
  }
  const canPrevious =
    transport.previousTracks.length > 0 || transport.playbackIndex > 0;
  const canNext =
    (transport.shuffle && transport.playbackList.length > 1) ||
    transport.queue.length > 0 ||
    transport.playbackIndex + 1 < transport.playbackList.length ||
    (transport.repeat === "all" && transport.playbackList.length > 0) ||
    (!!details.related?.length && !transport.playbackList.length);
  const next = () => transport.advance(related.current, true);
  return (
    <View
      style={
        expanded
          ? [
              styles.container,
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 20,
                paddingTop: insets.top,
              },
            ]
          : styles.container
      }
    >
      {expanded && (
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <IconButton
            name="keyboard-arrow-down"
            label="Back to browsing"
            onPress={() => setExpanded(false)}
          />
          <View
            style={[
              styles.row,
              { backgroundColor: "#202020", borderRadius: 24 },
            ]}
          >
            <IconButton
              name="headphones"
              label="Audio"
              active={audioMode}
              disabled={switching}
              onPress={() => changeMode(true)}
            />
            <IconButton
              name="smart-display"
              label="Video"
              active={!audioMode}
              disabled={switching}
              onPress={() => changeMode(false)}
            />
          </View>
          <IconButton
            name="picture-in-picture-alt"
            label="Popup"
            onPress={() =>
              view.current
                ?.startPictureInPicture()
                .catch((e) => setActionError(message(e)))
            }
          />
          <IconButton
            name="close"
            label="Close player"
            onPress={() => transport.setCurrentTrack(null)}
          />
        </View>
      )}
      <View
        style={{
          height: expanded ? Math.min((width * 9) / 16, height * 0.32) : 1,
          backgroundColor: "#000",
        }}
      >
        <VideoView
          ref={view}
          player={player}
          style={{ width: "100%", height: "100%", opacity: audioMode ? 0 : 1 }}
          nativeControls={expanded && !audioMode}
          fullscreenOptions={{ enable: true }}
          allowsPictureInPicture
          startsPictureInPictureAutomatically={
            expanded && !audioMode && settings.autoPip
          }
          contentFit="contain"
        />
        {audioMode && expanded && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {track.cover ? (
              <Image
                source={{ uri: track.cover }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            ) : (
              <Text raw style={styles.title}>
                {track.artist}
              </Text>
            )}
          </View>
        )}
      </View>
      <View style={[styles.row, { paddingHorizontal: 12 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Expand player")}
          style={{ flex: 1, paddingVertical: 12 }}
          onPress={() => setExpanded(!expanded)}
        >
          <Text
            raw
            style={[styles.title, { fontSize: expanded ? 20 : 14 }]}
            numberOfLines={expanded ? 2 : 1}
          >
            {track.title}
          </Text>
          <Text raw style={styles.muted} numberOfLines={1}>
            {track.artist}
          </Text>
        </Pressable>
        {expanded ? (
          <IconButton
            name={favorite ? "favorite" : "favorite-border"}
            label={favorite ? "Remove favorite" : "Favorite"}
            active={favorite}
            onPress={() => transport.toggleFavorite(track.id)}
          />
        ) : (
          <>
            <IconButton
              name={playing ? "pause" : "play-arrow"}
              label={playing ? "Pause" : "Play"}
              disabled={loading}
              onPress={() => (playing ? player.pause() : player.play())}
            />
            <IconButton
              name="skip-next"
              label="Next"
              disabled={!canNext}
              onPress={next}
            />
            <IconButton
              name="close"
              label="Close player"
              onPress={() => transport.setCurrentTrack(null)}
            />
          </>
        )}
      </View>
      {expanded && (
        <>
          <SeekBar
            value={position}
            duration={duration}
            onSeek={(value) => {
              player.currentTime = value;
            }}
          />
          <View
            style={[
              styles.row,
              {
                direction: "ltr",
                justifyContent: "space-between",
                paddingHorizontal: 14,
              },
            ]}
          >
            <Text style={styles.muted}>{clock(position)}</Text>
            <Text style={styles.muted}>{clock(duration)}</Text>
          </View>
          <View
            style={[
              styles.row,
              {
                direction: "ltr",
                justifyContent: "space-evenly",
                paddingVertical: 8,
              },
            ]}
          >
            <IconButton
              name="shuffle"
              label="Shuffle"
              active={transport.shuffle}
              onPress={() =>
                usePlayerStore.setState({ shuffle: !transport.shuffle })
              }
            />
            <IconButton
              name="skip-previous"
              label="Previous"
              size={36}
              disabled={!canPrevious}
              onPress={() => transport.previous()}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(playing ? "Pause" : "Play")}
              disabled={loading}
              onPress={() => (playing ? player.pause() : player.play())}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ color: "#000", fontSize: 30, textAlign: "center" }}
              >
                {loading ? "…" : playing ? "Ⅱ" : "▶"}
              </Text>
            </Pressable>
            <IconButton
              name="skip-next"
              label="Next"
              size={36}
              disabled={!canNext}
              onPress={next}
            />
            <IconButton
              name={transport.repeat === "one" ? "repeat-one" : "repeat"}
              label={
                transport.repeat === "one"
                  ? "Repeat one"
                  : transport.repeat === "all"
                    ? "Repeat all"
                    : "Repeat off"
              }
              active={transport.repeat !== "off"}
              onPress={() =>
                usePlayerStore.setState({
                  repeat:
                    transport.repeat === "off"
                      ? "all"
                      : transport.repeat === "all"
                        ? "one"
                        : "off",
                })
              }
            />
          </View>
          <View
            style={[styles.row, { direction: "ltr", justifyContent: "center" }]}
          >
            <IconButton
              name="replay-10"
              label="Seek back 10 seconds"
              onPress={() => seek(-10)}
            />
            <IconButton
              name="forward-10"
              label="Seek forward 10 seconds"
              onPress={() => seek(10)}
            />
          </View>
        </>
      )}
      {!!error && (
        <View style={styles.row}>
          <Text accessibilityRole="alert" style={{ color: "#ff9c9c", flex: 1 }}>
            {error}
          </Text>
          <IconButton name="refresh" label="Retry" onPress={onRetry} />
        </View>
      )}
      {!!actionError && (
        <Text accessibilityRole="alert" style={{ color: "#ff9c9c" }}>
          {actionError}
        </Text>
      )}
      {expanded && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        >
          <WatchDetails
            track={{ ...details, kind: track.kind, localUri: track.localUri }}
            position={() => player.currentTime}
            background={() => {
              transport.updateSettings({ background: true });
              setExpanded(false);
            }}
            popup={() =>
              view.current
                ?.startPictureInPicture()
                .catch((e) => setActionError(message(e)))
            }
          />
        </ScrollView>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { backgroundColor: "#0b0b0b" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { color: "white", fontWeight: "600", fontSize: 16 },
  muted: { color: "#aaa", fontSize: 13 },
  button: { color: "#eee", padding: 12, fontSize: 14 },
});
