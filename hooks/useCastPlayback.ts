import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import type { VideoPlayer } from "expo-video";
import type { Track } from "@/types/media";
import { resolveYouTubeCast, type MediaSource } from "@/utils/youtube";
import { resolveLocalCast } from "@/utils/localCast";
import {
  castMedia,
  canPrepareYouTubeCast,
  canPrepareLocalCast,
  localCastContentId,
  youtubeCastContentId,
  CastHandoff,
  CAST_SOURCE_UNSUPPORTED,
  CAST_YOUTUBE_UNSUPPORTED,
  CAST_LOCAL_UNSUPPORTED,
  CAST_UNAVAILABLE,
  EMPTY_CAST_STATE,
  type CastState,
  type CastTransport,
} from "@/utils/cast";
import { useLocale } from "@/utils/i18n";

interface CastModule extends CastTransport {
  getState(): Promise<CastState>;
  adopt(contentId: string): Promise<void>;
  configure(
    eligible: boolean,
    reason: string,
    label: string,
    unavailable: string,
  ): void;
  showPicker(requestPlayback: boolean): Promise<void>;
  configureLocal?(local: boolean, caption: string, stop: string): void;
  reserveLocal?(): Promise<void>;
  command(action: string, value: number): Promise<void>;
  disconnect(): Promise<void>;
  addListener(name: string): void;
  removeListeners(count: number): void;
}
const native =
  Platform.OS === "android" && !Platform.isTV
    ? (NativeModules.HarmoniaCast as CastModule | undefined)
    : undefined;
const noTransport: CastTransport = {
  load: async () => {
    throw new Error(CAST_UNAVAILABLE);
  },
  stopOwned: async () => {},
};

let pendingStop: Promise<void> = Promise.resolve();
export const waitForCastStop = () => pendingStop;
const transport: CastTransport = native
  ? {
      getState: () => native.getState(),
      load: (...args) => native.load(...args),
      stopOwned: (id) => {
        pendingStop = native.stopOwned(id);
        return pendingStop;
      },
    }
  : noTransport;

export function useCastPlayback(
  track: Track,
  source: MediaSource,
  player: VideoPlayer,
  exitFullscreen: () => void,
) {
  const { t } = useLocale();
  const [remote, setRemote] = useState(EMPTY_CAST_STATE);
  const [error, setError] = useState("");
  const wantsCast = useRef(false);
  const live = useRef(true);
  const exit = useRef(exitFullscreen);
  exit.current = exitFullscreen;
  const media = useMemo(() => castMedia(track, source), [track, source]);
  const local = canPrepareLocalCast(track);
  const resolver = useMemo(
    () =>
      local
        ? {
            contentId: localCastContentId(track),
            resolve: async (signal: AbortSignal) => {
              await waitForCastStop();
              return resolveLocalCast(track, signal);
            },
            canAdopt: (state: CastState) => state.localSourceActive,
          }
        : canPrepareYouTubeCast(track)
          ? {
              contentId: youtubeCastContentId(track),
              resolve: async (signal: AbortSignal) => {
                await waitForCastStop();
                return resolveYouTubeCast(track, signal);
              },
            }
          : undefined,
    [track, local],
  );
  const eligible = !!media || !!resolver;
  const sourceReason = track.localUri
    ? CAST_LOCAL_UNSUPPORTED
    : track.youtubeId
      ? CAST_YOUTUBE_UNSUPPORTED
      : CAST_SOURCE_UNSUPPORTED;
  const handoff = useMemo(
    () =>
      new CastHandoff(
        media,
        transport,
        {
          position: () => player.currentTime,
          playing: () => player.playing,
          pause: () => player.pause(),
          play: () => player.play(),
          seek: (position) => {
            player.currentTime = position;
          },
        },
        resolver,
      ),
    [media, player, resolver],
  );
  const state = useSyncExternalStore(
    handoff.subscribe,
    handoff.getSnapshot,
    handoff.getSnapshot,
  );
  useEffect(() => {
    live.current = true;
    handoff.activate();
    if (!native)
      return () => {
        live.current = false;
        handoff.dispose();
      };
    let alive = true;
    let revision = 0;
    let adopting = false;
    let readyForAdoption = false;
    let connection = "disconnected";
    const emitter = new NativeEventEmitter(native);
    const update = (next: CastState) => {
      if (!alive || next.revision <= revision) return;
      revision = next.revision;
      connection = next.connection;
      setRemote(next);
      if (next.connection === "disconnected") pendingStop = Promise.resolve();
      handoff.observe(next);
      if (
        next.connection === "connected" &&
        readyForAdoption &&
        handoff.contentId &&
        next.contentId === handoff.contentId &&
        next.hasMedia &&
        handoff.accepts(next) &&
        !wantsCast.current &&
        !adopting &&
        !handoff.getSnapshot().active &&
        !handoff.getSnapshot().loading &&
        !handoff.getSnapshot().preparing
      ) {
        adopting = true;
        void native
          .adopt(handoff.contentId)
          .then(() => {
            if (alive) handoff.adopt(next);
          })
          .catch(() => {
            if (alive) setError("Cast receiver disconnected.");
          })
          .finally(() => {
            adopting = false;
          });
      }
      if (next.connection === "connected" && wantsCast.current) {
        wantsCast.current = false;
        exit.current();
        void handoff.start();
      }
    };
    const status = emitter.addListener("HarmoniaCastState", update);
    const failure = emitter.addListener(
      "HarmoniaCastError",
      (value: string) => {
        if (alive) setError(value);
      },
    );
    const picker = emitter.addListener("HarmoniaCastPicker", () => {
      setError("");
      wantsCast.current = eligible;
      if (eligible && connection === "connected") {
        wantsCast.current = false;
        exit.current();
        void handoff.start();
      }
    });
    const closed = emitter.addListener("HarmoniaCastPickerClosed", () => {
      wantsCast.current = false;
    });
    waitForCastStop()
      .then(() => {
        readyForAdoption = true;
        return native.getState();
      })
      .then(update)
      .catch(() => {
        if (alive) setError(CAST_UNAVAILABLE);
      });
    return () => {
      alive = false;
      live.current = false;
      wantsCast.current = false;
      status.remove();
      failure.remove();
      picker.remove();
      closed.remove();
      handoff.dispose();
    };
  }, [handoff, eligible]);
  useEffect(() => {
    native?.configure(
      eligible,
      t(sourceReason),
      t("Cast"),
      t(CAST_UNAVAILABLE),
    );
    native?.configureLocal?.(
      local,
      t("Casting downloaded media"),
      t("Stop casting"),
    );
  }, [eligible, sourceReason, t, local]);
  const picker = async () => {
    setError("");
    if (!native || !remote.available) {
      setError(CAST_UNAVAILABLE);
      return;
    }
    if (
      remote.connection === "suspended" ||
      remote.connection === "disconnecting"
    ) {
      setError(
        "Cast connection interrupted. Reconnect or disconnect before playing locally.",
      );
      return;
    }
    if (!eligible && remote.connection !== "connected") {
      setError(sourceReason);
      return;
    }
    if (local && eligible) {
      try {
        await native.reserveLocal?.();
      } catch {
        setError("Open Harmonia to start casting this download, then retry.");
        return;
      }
    }
    if (eligible && remote.connection === "connected" && !state.active) {
      exit.current();
      await handoff.start();
      return;
    }
    wantsCast.current = eligible && !state.active;
    try {
      await native.showPicker(true);
    } catch (error) {
      wantsCast.current = false;
      setError(String(error instanceof Error ? error.message : error));
    }
  };
  const command = async (action: string, value = 0) => {
    try {
      await native?.command(action, value);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  };
  const disconnect = async () => {
    try {
      await native?.disconnect();
    } catch {
      setError("Cast control failed. Check the receiver connection.");
    }
  };
  const prepareLocal = async () => {
    await waitForCastStop();
    const current = await native?.getState();
    if (!live.current) return false;
    if (
      current?.connection === "connecting" ||
      current?.connection === "suspended" ||
      current?.connection === "disconnecting"
    ) {
      setError(
        "Cast connection interrupted. Reconnect or disconnect before playing locally.",
      );
      return false;
    }
    if (
      current?.connection === "connected" &&
      handoff.contentId &&
      current.hasMedia &&
      current.contentId === handoff.contentId
    ) {
      if (!handoff.accepts(current)) {
        setError(
          "The downloaded Cast source stopped. Tap Cast to reconnect or disconnect first.",
        );
        return false;
      }
      await native?.adopt(handoff.contentId);
      setRemote(current);
      handoff.adopt(current);
      return false;
    }
    return true;
  };
  const showDevices = async () => {
    wantsCast.current = false;
    try {
      await native?.showPicker(false);
    } catch {
      setError(CAST_UNAVAILABLE);
    }
  };
  return {
    ...state,
    remote,
    prepareLocal,
    showDevices,
    error: state.error || error,
    picker,
    command,
    disconnect,
    returnLocal: () => handoff.returnLocal(),
    eligible,
  };
}
