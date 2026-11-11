import type { Track } from "@/types/media";
export interface ResumePoint {
  position: number;
  duration: number;
  updatedAt: number;
}
export const resumeKey = (track: Track) =>
  track.youtubeId ? `youtube:${track.youtubeId}` : track.sourcePage || track.id;
export function resumePosition(point?: ResumePoint): number {
  return point &&
    Number.isFinite(point.position) &&
    Number.isFinite(point.duration) &&
    point.duration >= 60 &&
    point.position >= 5 &&
    point.position < point.duration - 10
    ? point.position
    : 0;
}
export function saveResume(
  points: Record<string, ResumePoint>,
  track: Track,
  position: number,
  duration: number,
): Record<string, ResumePoint> {
  if (
    track.kind !== "video" ||
    !Number.isFinite(position) ||
    !Number.isFinite(duration) ||
    duration < 60
  )
    return points;
  const key = resumeKey(track);
  const previous = points[key];
  const point = { position, duration, updatedAt: Date.now() };
  const eligible = resumePosition(point) > 0;
  if ((!eligible && !previous) ||
      (eligible && previous?.position === position && previous.duration === duration))
    return points;
  const next = { ...points };
  if (eligible) next[key] = point;
  else delete next[key];
  return Object.fromEntries(
    Object.entries(next)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .slice(0, 100),
  );
}
