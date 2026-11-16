import type { Track } from "@/types/media";
type Stage = "discovery" | "ready" | "first-frame";
let nextSample = 0;
const timings = new WeakMap<Track, ReturnType<typeof submissionTiming>>();
/** Monotonic, URL-free diagnostics, one sample per stage and explicit submission. */
export function submissionTiming(now = () => performance.now(), submittedAt?: number) {
  const start = submittedAt ?? now();
  const sample = ++nextSample;
  const seen = new Set<Stage>();
  return {
    mark(stage: Stage) {
      if (seen.has(stage)) return;
      seen.add(stage);
      const elapsedMs = Math.round((now() - start) * 100) / 100;
      console.info("HarmoniaPlaybackTiming", JSON.stringify({ sample, stage, elapsedMs }));
      return elapsedMs;
    },
    attach(track: Track) { timings.set(track, this); },
  };
}
export function markPlaybackTiming(track: Track, stage: Stage) {
  return timings.get(track)?.mark(stage);
}

export function inheritPlaybackTiming(from: Track, to: Track) {
  const timing = timings.get(from);
  if (timing) timings.set(to, timing);
}
