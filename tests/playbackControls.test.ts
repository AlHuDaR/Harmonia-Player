import { describe, expect, it } from "vitest";
import { playbackLoop, seekPosition } from "../utils/playbackControls";

describe("playback controls", () => {
  it("maps the timeline to seconds and clamps drags outside either edge", () => {
    expect(seekPosition(40, 200, 75)).toBe(15);
    expect(seekPosition(-40, 200, 75)).toBe(0);
    expect(seekPosition(230, 200, 75)).toBe(75);
    expect(seekPosition(40, 0, 75)).toBe(0);
    expect(seekPosition(40, 200, Infinity)).toBe(0);
  });

  it("accepts only ordered, finite loop points at least two seconds apart", () => {
    expect(playbackLoop(3, 5, 5)).toEqual({ start: 3, end: 5 });
    expect(playbackLoop(3, 4.9, 10)).toBeNull();
    expect(playbackLoop(8, 5, 10)).toBeNull();
    expect(playbackLoop(-1, 5, 10)).toBeNull();
    expect(playbackLoop(3, 11, 10)).toBeNull();
    expect(playbackLoop(3, 5, Infinity)).toBeNull();
  });
});
