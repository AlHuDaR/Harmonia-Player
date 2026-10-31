import { FocusablePressable as Pressable } from "@/components/FocusablePressable";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/utils/theme";
import { IconButton } from "./MediaUI";
import { useLocale } from "@/utils/i18n";
import SeekBar from "./SeekBar";
import { Text } from "@/components/LocalizedText";
import WatchDetails from "./WatchDetails";
import { useEffect, useRef, useState } from "react";
import {
  View,
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
  playbackContentType,
  videoDetails,
  youtubeFormats,
  formatTrack,
  type MediaSource,
} from "@/utils/youtube";
import { message, type Track } from "@/types/media";
import { useCastPlayback } from "@/hooks/useCastPlayback";
import { Button } from "./MediaUI";

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
  const theme = useTheme();
  const styles = usePlayerStyles();
  const expanded = usePlayerStore((s) => s.expanded);
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
      <View
        style={[
          styles.container,
          expanded && {
            position: "absolute",
            inset: 0,
            zIndex: 20,
            padding: 16,
            justifyContent: "center",
          },
        ]}
      >
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
  const theme = useTheme();
  const styles = usePlayerStyles();
  const transport = usePlayerStore();
  const [audioMode, setAudioMode] = useState(track.kind === "audio");
  const [switching, setSwitching] = useState(false);
  const modeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => modeRequest.current?.abort(), []);
  const settings = usePlayerStore((s) => s.settings);
  const favorite = usePlayerStore((s) => s.favorites.includes(track.id));
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const speed = settings.playbackSpeed;
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const expanded = usePlayerStore((s) => s.expanded);
  const setExpanded = usePlayerStore((s) => s.setExpanded);

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
      contentType: playbackContentType(uri),
      metadata: {
        title: track.title,
        artist: track.artist,
        artwork: track.cover,
      },
    },
    (p) => {
      p.timeUpdateEventInterval = 1;
      p.audioMixingMode = "doNotMix";
      if (Platform.OS === "android")
        p.bufferOptions = {
          preferredForwardBufferDuration: 20,
          minBufferForPlayback: 2,
          maxBufferBytes: 32 * 1024 * 1024,
          prioritizeTimeOverSizeThreshold: false,
        };
    },
  );
  const cast = useCastPlayback(track, uri, player, () => {
    view.current?.exitFullscreen().catch(() => {});
  });
  const remoteActive = cast.active || cast.loading;
  const currentPosition = remoteActive ? cast.remote.position : position;
  const currentDuration = remoteActive ? cast.remote.duration : duration;
  const isPlaying = remoteActive ? cast.remote.playing : playing;
  const isLoading = remoteActive
    ? cast.loading || cast.remote.buffering
    : loading;
  const togglePlayback = () => {
    if (remoteActive) void cast.command(cast.remote.playing ? "pause" : "play");
    else if (player.playing) player.pause();
    else
      cast
        .prepareLocal()
        .then((allowed) => {
          if (allowed) player.play();
        })
        .catch(() =>
          setActionError(
            "Receiver status is uncertain. Disconnect Cast before resuming local playback.",
          ),
        );
  };
  useEffect(() => {
    player.playbackRate = settings.playbackSpeed;
    player.staysActiveInBackground = settings.background && !remoteActive;
    player.showNowPlayingNotification = settings.background && !remoteActive;
  }, [player, settings.background, settings.playbackSpeed, remoteActive]);
  const bookmark = useRef({ position: 0, duration: 0 });
  bookmark.current = { position: currentPosition, duration: currentDuration };
  useEffect(() => {
    const remember = () =>
      usePlayerStore
        .getState()
        .rememberPosition(
          track,
          bookmark.current.position,
          bookmark.current.duration,
        );
    const timer = setInterval(remember, 10000);
    return () => {
      clearInterval(timer);
      remember();
    };
  }, [track]);
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
      if (e.status === "readyToPlay") {
        setDuration(player.duration);
        setError("");
      }
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
    let alive = true;
    cast
      .prepareLocal()
      .then((allowed) => {
        if (alive && allowed) player.play();
      })
      .catch(() => {
        if (alive)
          setActionError(
            "Receiver status is uncertain. Disconnect Cast before resuming local playback.",
          );
      });
    return () => {
      alive = false;
      if (Platform.OS === "web") {
        player.pause();
        player.timeUpdateEventInterval = 0;
      }
    };
  }, [player]);
  function seek(delta: number) {
    if (remoteActive) {
      void cast.command("seek", Math.max(0, cast.remote.position + delta));
      return;
    }
    player.currentTime = Math.max(
      0,
      Math.min(
        player.duration || Number.MAX_SAFE_INTEGER,
        player.currentTime + delta,
      ),
    );
  }
  async function changeMode(audio: boolean) {
    if (switching || remoteActive) return;
    if (!track.youtubeId || track.localUri) {
      setAudioMode(audio);
      return;
    }
    setSwitching(true);
    setActionError("");
    const controller = new AbortController();
    modeRequest.current = controller;
    try {
      const formats = await youtubeFormats(track, controller.signal);
      const kind = audio ? "audio" : "video";
      const format = formats.find((f) => f.kind === kind);
      if (!format) throw new Error("No compatible formats available.");
      if (
        controller.signal.aborted ||
        usePlayerStore.getState().currentTrack?.id !== track.id
      )
        return;
      usePlayerStore
        .getState()
        .switchFormat(formatTrack(track, format), player.currentTime);
    } catch (e) {
      if (!controller.signal.aborted) setActionError(message(e));
    } finally {
      if (!controller.signal.aborted) setSwitching(false);
    }
  }
  const finishedCast = useRef(false);
  useEffect(() => {
    if (!cast.active || cast.remote.idleReason !== 1) {
      finishedCast.current = false;
      return;
    }
    if (finishedCast.current) return;
    finishedCast.current = true;
    const store = usePlayerStore.getState();
    if (store.repeat === "one")
      void cast.command("seek", 0).then(() => cast.command("play"));
    else store.advance(related.current);
  }, [cast.active, cast.remote.idleReason]);
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
              },
            ]
          : styles.container
      }
    >
      <ScrollView
        scrollEnabled={expanded}
        style={expanded ? { flex: 1 } : { flexGrow: 0 }}
        contentContainerStyle={expanded ? { paddingBottom: 12 } : undefined}
      >
        {expanded && (
          <View
            style={[
              styles.row,
              { justifyContent: "space-between", flexWrap: "wrap" },
            ]}
          >
            <IconButton
              name="keyboard-arrow-down"
              label="Back to browsing"
              onPress={() => setExpanded(false)}
            />
            <View
              style={[
                styles.row,
                { backgroundColor: theme.surface, borderRadius: 24 },
              ]}
            >
              <IconButton
                name="headphones"
                label="Audio"
                active={audioMode}
                disabled={switching || remoteActive}
                onPress={() => changeMode(true)}
              />
              <IconButton
                name="smart-display"
                label="Video"
                active={!audioMode}
                disabled={switching || remoteActive}
                onPress={() => changeMode(false)}
              />
            </View>
            <IconButton
              name="fullscreen"
              label="Fullscreen"
              disabled={remoteActive}
              onPress={() => {
                view.current
                  ?.enterFullscreen()
                  .catch((e) => setActionError(message(e)));
              }}
            />
            <IconButton
              name="picture-in-picture-alt"
              label="Popup"
              disabled={remoteActive}
              onPress={() => {
                view.current
                  ?.startPictureInPicture()
                  .catch((e) => setActionError(message(e)));
              }}
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
            height: expanded
              ? Platform.isTV
                ? Math.max(180, height * 0.55)
                : Math.min((width * 9) / 16, height * 0.25)
              : 1,
            backgroundColor: audioMode ? theme.surface : theme.mediaBackground,
          }}
        >
          <VideoView
            ref={view}
            player={player}
            style={{
              width: "100%",
              height: "100%",
              opacity: audioMode ? 0 : 1,
            }}
            nativeControls={expanded && !audioMode && !remoteActive}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
            startsPictureInPictureAutomatically={
              expanded && !audioMode && !remoteActive && settings.autoPip
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
                <Text style={styles.title}>Audio</Text>
              )}
            </View>
          )}
        </View>
        <View
          style={[
            styles.row,
            { paddingHorizontal: 10, minHeight: expanded ? 52 : 50 },
          ]}
        >
          {!expanded &&
            (track.cover ? (
              <Image
                source={{ uri: track.cover }}
                style={{ width: 34, height: 34, borderRadius: 7 }}
              />
            ) : (
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 7,
                  backgroundColor: theme.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.muted }}>♪</Text>
              </View>
            ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Expand player")}
            style={{ flex: 1, minWidth: 0, paddingVertical: 8 }}
            onPress={() => setExpanded(!expanded)}
          >
            <Text
              raw
              style={[styles.title, { fontSize: expanded ? 20 : 14 }]}
              numberOfLines={expanded ? 2 : 1}
            >
              {track.title}
            </Text>
            {expanded && (
              <Text raw numberOfLines={1} style={styles.muted}>
                {track.artist}
              </Text>
            )}
          </Pressable>
          {!Platform.isTV && (
            <IconButton
              name={
                cast.remote.connection === "connected"
                  ? "cast-connected"
                  : "cast"
              }
              label="Cast"
              active={remoteActive}
              onPress={() => {
                void cast.picker();
              }}
            />
          )}
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
                name={isPlaying ? "pause" : "play-arrow"}
                label={isPlaying ? "Pause" : "Play"}
                disabled={isLoading || (remoteActive && !cast.remote.canPause)}
                onPress={togglePlayback}
              />
              <IconButton
                name="skip-next"
                label="Next"
                disabled={!canNext}
                onPress={next}
              />
            </>
          )}
        </View>
        {expanded && (
          <>
            {!!uri.label && <Text style={styles.muted}>{uri.label}</Text>}
            <SeekBar
              value={currentPosition}
              duration={currentDuration}
              disabled={remoteActive && !cast.remote.canSeek}
              onSeek={(value) => {
                if (remoteActive) {
                  if (cast.remote.canSeek) void cast.command("seek", value);
                } else player.currentTime = value;
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
              <Text
                accessibilityLabel={`${t("Playback position")} ${clock(currentPosition)}`}
                style={styles.muted}
              >
                {clock(currentPosition)}
              </Text>
              <Text
                accessibilityLabel={`${t("Media duration")} ${clock(currentDuration)}`}
                style={styles.muted}
              >
                {clock(currentDuration)}
              </Text>
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
                accessibilityLabel={t(isPlaying ? "Pause" : "Play")}
                disabled={isLoading || (remoteActive && !cast.remote.canPause)}
                onPress={togglePlayback}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: theme.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name={
                    isLoading
                      ? "hourglass-empty"
                      : isPlaying
                        ? "pause"
                        : "play-arrow"
                  }
                  size={32}
                  color={theme.onAccent}
                />
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
              style={[
                styles.row,
                { direction: "ltr", justifyContent: "center" },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                disabled={remoteActive}
                accessibilityLabel={`${t("Playback speed")} ${speed}×`}
                onPress={() => {
                  const rates = [0.75, 1, 1.25, 1.5, 2];
                  const next = rates[(rates.indexOf(speed) + 1) % rates.length];
                  transport.updateSettings({ playbackSpeed: next });
                }}
              >
                <Text raw style={styles.button}>
                  {speed}×
                </Text>
              </Pressable>
              <IconButton
                name="replay-10"
                label="Seek back 10 seconds"
                disabled={remoteActive && !cast.remote.canSeek}
                onPress={() => seek(-10)}
              />
              <IconButton
                name="forward-10"
                label="Seek forward 10 seconds"
                disabled={remoteActive && !cast.remote.canSeek}
                onPress={() => seek(10)}
              />
            </View>
          </>
        )}
        {!!error && (
          <View style={styles.row}>
            <Text
              accessibilityRole="alert"
              style={{ color: theme.error, flex: 1 }}
            >
              {error}
            </Text>
            <IconButton
              name="refresh"
              label="Retry"
              onPress={() => {
                usePlayerStore.setState({ position: player.currentTime });
                onRetry();
              }}
            />
          </View>
        )}
        {!Platform.isTV &&
          cast.remote.connection !== "disconnected" &&
          expanded && (
            <View style={{ padding: 12, gap: 8 }}>
              <Text raw style={styles.muted}>
                {t(remoteActive ? "Playing on receiver" : "Cast connected")} ·{" "}
                {cast.remote.deviceName}
              </Text>
              <View style={[styles.row, { flexWrap: "wrap" }]}>
                {remoteActive && (
                  <Button
                    title="Play locally"
                    onPress={() => {
                      void cast.returnLocal();
                    }}
                  />
                )}
                <Button
                  title="Cast devices"
                  onPress={() => {
                    void cast.showDevices();
                  }}
                />
                <Button
                  title="Disconnect Cast"
                  onPress={() => {
                    void cast.disconnect();
                  }}
                />
                {remoteActive && cast.remote.canVolume && (
                  <>
                    <IconButton
                      name="volume-down"
                      label="Lower receiver volume"
                      onPress={() => {
                        void cast.command("volume", cast.remote.volume - 0.1);
                      }}
                    />
                    <IconButton
                      name="volume-up"
                      label="Raise receiver volume"
                      onPress={() => {
                        void cast.command("volume", cast.remote.volume + 0.1);
                      }}
                    />
                  </>
                )}
              </View>
            </View>
          )}
        {!!cast.error && (
          <Text
            accessibilityRole="alert"
            style={{ color: theme.error, paddingHorizontal: 12 }}
          >
            {cast.error}
          </Text>
        )}
        {!!actionError && (
          <Text accessibilityRole="alert" style={{ color: theme.error }}>
            {actionError}
          </Text>
        )}
        {expanded && (
          <View>
            <WatchDetails
              track={{ ...details, kind: track.kind, localUri: track.localUri }}
              position={() => currentPosition}
              background={() => {
                transport.updateSettings({ background: true });
                setExpanded(false);
              }}
              popup={() => {
                if (remoteActive) {
                  setActionError(
                    "Return to local playback to use this control.",
                  );
                  return;
                }
                view.current
                  ?.startPictureInPicture()
                  .catch((e) => setActionError(message(e)));
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
function usePlayerStyles() {
  const theme = useTheme();
  return StyleSheet.create({
    container: { backgroundColor: theme.surface, flexShrink: 0 },
    row: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: { color: theme.text, fontWeight: "600", fontSize: 16 },
    muted: { color: theme.muted, fontSize: 13 },
    button: { color: theme.text, padding: 12, fontSize: 14 },
  });
}
