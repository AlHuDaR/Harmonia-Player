import { NativeModules, Platform } from "react-native";
import type { Track } from "@/types/media";
import {
  CAST_LOCAL_UNSUPPORTED,
  localCastContentId,
  localCastMedia,
  type CastMedia,
} from "./cast";
interface LocalBridge {
  prepareLocal(
    uri: string,
    kind: string,
    id: string,
    nonce: string,
    title: string,
  ): Promise<Omit<CastMedia, "title" | "artist">>;
  cancelLocal(nonce: string): void;
}
let sequence = 0;
const messages = new Set([
  CAST_LOCAL_UNSUPPORTED,
  "Connect this phone and the Cast receiver to the same Wi-Fi, then retry.",
  "Open Harmonia to start casting this download, then retry.",
  "Stop the current Cast before sharing another download.",
  "Cast receiver disconnected.",
  "Cast preparation cancelled. Local playback is available.",
]);
export async function resolveLocalCast(
  track: Track,
  signal: AbortSignal,
): Promise<CastMedia> {
  const bridge =
    Platform.OS === "android"
      ? (NativeModules.HarmoniaCast as LocalBridge | undefined)
      : undefined;
  if (!bridge?.prepareLocal || !bridge.cancelLocal)
    throw new Error(
      "Install the updated Android APK to cast downloaded files.",
    );
  const nonce = `${Date.now()}-${++sequence}`;
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (error?: Error, media?: CastMedia) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(media!);
    };
    const cancel = () => {
      try {
        bridge.cancelLocal(nonce);
      } catch {}
    };
    const abort = () => {
      cancel();
      finish(
        new Error("Cast preparation cancelled. Local playback is available."),
      );
    };
    const timer = setTimeout(() => {
      cancel();
      finish(
        new Error(
          "Cast preparation timed out. Keep playing here or try again.",
        ),
      );
    }, 30000);
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    const failure = (error?: { message?: string }) =>
      finish(
        new Error(
          messages.has(error?.message || "")
            ? error!.message!
            : CAST_LOCAL_UNSUPPORTED,
        ),
      );
    try {
      bridge
        .prepareLocal(
          track.localUri!,
          track.kind,
          localCastContentId(track),
          nonce,
          track.title,
        )
        .then((candidate) => {
          if (finished) return;
          try {
            finish(undefined, localCastMedia(track, candidate));
          } catch {
            cancel();
            finish(new Error(CAST_LOCAL_UNSUPPORTED));
          }
        }, failure);
    } catch {
      failure();
    }
  });
}
