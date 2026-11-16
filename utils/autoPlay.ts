import { NativeModules, Platform } from "react-native";
/** Ephemeral user intent. Never persisted or recreated by library hydration. */
let revision = 0;
export function cancelAutoPlay() { revision++; }
export function autoPlayIntent() {
  const token = ++revision;
  let consumed = false;
  return {
    cancel() { if (token === revision) revision++; },
    async start(allowed: () => Promise<boolean>, play: () => void) {
      if (consumed || token !== revision) return false;
      consumed = true;
      if (!await allowed() || token !== revision) return false;
      play();
      return true;
    },
  };
}

// Reopening the same format is a new request, including when the old player is paused.
// Object identity changes only when the store accepts a playback/format request.
const instances = new WeakMap<object, number>();
let nextInstance = 0;
export function playbackInstance(track: object) {
  let instance = instances.get(track);
  if (instance === undefined) { instance = ++nextInstance; instances.set(track, instance); }
  return instance;
}

/** Fail closed when a receiver exists or its state cannot be established. */
export async function canAutoPlayLocally(signal?: AbortSignal) {
  if (signal?.aborted) return false;
  try {
    const cast = NativeModules.HarmoniaCast;
    if (Platform.OS === "android" && !Platform.isTV && cast) {
      const state = await cast.getState();
      if (state.connection !== "disconnected") return false;
    }
    return !signal?.aborted;
  } catch { return false; }
}
