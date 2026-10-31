import { describe, expect, it } from "vitest";
import { resumeKey, resumePosition, saveResume } from "../utils/playbackResume";
const track = {
  id: "one",
  title: "Movie",
  artist: "Library",
  kind: "video" as const,
};
describe("bounded eligible video resume", () => {
  it("saves long videos, clears completed positions and skips short/live/audio sources", () => {
    const points = saveResume({}, track, 90, 300);
    expect(resumePosition(points.one)).toBe(90);
    expect(saveResume(points, track, 299, 300)).toEqual({});
    for (const duration of [0, Infinity, NaN, 20])
      expect(saveResume({}, track, 10, duration)).toEqual({});
    expect(saveResume({}, { ...track, kind: "audio" }, 90, 300)).toEqual({});
    expect(resumePosition({ position: NaN, duration: 300, updatedAt: 0 })).toBe(
      0,
    );
  });
  it("shares bookmarks across YouTube qualities without storing a media URL", () => {
    expect(
      resumeKey({ ...track, youtubeId: "abcdefghijk", formatId: "auto" }),
    ).toBe(
      resumeKey({
        ...track,
        id: "other",
        youtubeId: "abcdefghijk",
        formatId: "video:137",
      }),
    );
  });
  it("bounds persisted history at 100 entries", () => {
    let points = {};
    for (let n = 0; n < 120; n++)
      points = saveResume(points, { ...track, id: String(n) }, 90, 300);
    expect(Object.keys(points)).toHaveLength(100);
  });
});
