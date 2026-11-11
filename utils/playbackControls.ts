export const playbackSpeeds: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export type LoopRange = { start: number; end: number };
export function playbackLoop(start: number, end: number, duration: number): LoopRange | null {
  if (![start, end, duration].every(Number.isFinite) || start < 0 ||
      end > duration || end - start < 2) return null;
  return { start, end };
}

export function seekPosition(x: number, width: number, duration: number): number {
  if (![x, width, duration].every(Number.isFinite) || width <= 0 || duration <= 0) return 0;
  return Math.min(1, Math.max(0, x / width)) * duration;
}
