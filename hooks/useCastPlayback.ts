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
import type { MediaSource } from "@/utils/youtube";
import {
  castMedia,
  CastHandoff,
  CAST_SOURCE_UNSUPPORTED,
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
  const handoff = useMemo(
    () =>
      new CastHandoff(media, transport, {
        position: () => player.currentTime,
        playing: () => player.playing,
        pause: () => player.pause(),
        play: () => player.play(),
        seek: (position) => {
          player.currentTime = position;
        },
      }),
    [media, player],
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
    const emitter = new NativeEventEmitter(native);
    const update = (next: CastState) => {
      if (!alive || next.revision <= revision) return;
      revision = next.revision;
      setRemote(next);
      if (next.connection === "disconnected") pendingStop = Promise.resolve();
      handoff.observe(next);
      if (
        next.connection === "connected" &&
        media &&
        next.contentId === media.uri &&
        next.hasMedia &&
        !wantsCast.current &&
        !adopting &&
        !handoff.getSnapshot().active &&
        !handoff.getSnapshot().loading
      ) {
        adopting = true;
        void native
          .adopt(media.uri)
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
      wantsCast.current = !!media;
    });
    const closed = emitter.addListener("HarmoniaCastPickerClosed", () => {
      wantsCast.current = false;
    });
    native
      .getState()
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
  }, [handoff, media]);
  useEffect(() => {
    native?.configure(
      !!media,
      t(CAST_SOURCE_UNSUPPORTED),
      t("Cast"),
      t(CAST_UNAVAILABLE),
    );
  }, [media, t]);
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
    if (!media && remote.connection !== "connected") {
      setError(CAST_SOURCE_UNSUPPORTED);
      return;
    }
    if (media && remote.connection === "connected" && !state.active) {
      exit.current();
      await handoff.start();
      return;
    }
    wantsCast.current = !!media && !state.active;
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
      media &&
      current.hasMedia &&
      current.contentId === media.uri
    ) {
      await native?.adopt(media.uri);
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
    eligible: !!media,
  };
}
