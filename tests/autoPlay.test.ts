import { beforeEach, describe, expect, it, vi } from "vitest";
const cast = vi.hoisted(() => ({ getState: vi.fn() }));
vi.mock("react-native", () => ({ NativeModules: { HarmoniaCast: cast }, Platform: { OS: "android" } }));
import { autoPlayIntent, cancelAutoPlay, playbackInstance, canAutoPlayLocally } from "../utils/autoPlay";
import { autoPlayChoice, type MediaChoice } from "../utils/mediaDiscovery";
import { inheritPlaybackTiming, markPlaybackTiming, submissionTiming } from "../utils/playbackTiming";
const choice = (id: string, label = id, kind: "video" | "audio" = "video"): MediaChoice => ({
  id, label, kind, downloadable: true, track: { id, title: id, artist: "Test", kind },
});
beforeEach(() => { cast.getState.mockResolvedValue({ connection: "disconnected" }); });
describe("explicit submission auto-play", () => {
  it("checks actual Cast state and fails closed for a receiver or bridge error", async () => {
    expect(await canAutoPlayLocally()).toBe(true);
    cast.getState.mockResolvedValue({ connection: "connected" });
    expect(await canAutoPlayLocally()).toBe(false);
    cast.getState.mockResolvedValue({ connection: "connecting" });
    expect(await canAutoPlayLocally()).toBe(false);
    cast.getState.mockRejectedValue(Error("Unavailable"));
    expect(await canAutoPlayLocally()).toBe(false);
  });
  it("does not start after cancellation while reading Cast state", async () => {
    let finish!: (value: { connection: string }) => void;
    cast.getState.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const controller = new AbortController();
    const result = canAutoPlayLocally(controller.signal);
    controller.abort();
    finish({ connection: "disconnected" });
    expect(await result).toBe(false);
  });
  it("reopens an intentionally resubmitted paused format while keeping the current instance stable", () => {
    const track = choice("same-format").track;
    expect(playbackInstance(track)).toBe(playbackInstance(track));
    expect(playbackInstance({ ...track })).not.toBe(playbackInstance(track));
  });
  it("starts once after discovery and does not start any download", async () => {
    const intent = autoPlayIntent(), play = vi.fn();
    expect(await intent.start(async () => true, play)).toBe(true);
    expect(await intent.start(async () => true, play)).toBe(false);
    expect(play).toHaveBeenCalledTimes(1);
  });
  it.each(["cancel", "pause", "new submission"])("ignores a late result after %s", async (action) => {
    const intent = autoPlayIntent(), play = vi.fn();
    let finish!: (allowed: boolean) => void;
    const result = intent.start(() => new Promise((resolve) => { finish = resolve; }), play);
    if (action === "cancel") intent.cancel();
    else if (action === "pause") cancelAutoPlay();
    else autoPlayIntent();
    finish(true);
    expect(await result).toBe(false);
    expect(play).not.toHaveBeenCalled();
  });
  it("leaves Cast active and never retries a failed playback request automatically", async () => {
    const intent = autoPlayIntent(), play = vi.fn();
    expect(await intent.start(async () => false, play)).toBe(false);
    expect(await intent.start(async () => true, play)).toBe(false);
    const failed = autoPlayIntent();
    await expect(failed.start(async () => true, () => { throw Error("Playback failed"); })).rejects.toThrow("Playback failed");
    expect(await failed.start(async () => true, play)).toBe(false);
    expect(play).not.toHaveBeenCalled();
  });
  it("prefers bounded native Auto, then modest MP4, retaining every manual option", () => {
    const choices = [choice("4k", "2160p MP4"), choice("720", "720p MP4"), choice("360", "360p MP4"), choice("auto")];
    expect(autoPlayChoice({ title: "x", choices })?.id).toBe("auto");
    expect(autoPlayChoice({ title: "x", choices: choices.slice(0, 3) })?.id).toBe("720");
    expect(choices).toHaveLength(4);
    expect(autoPlayChoice({ title: "x", choices: [choice("hls"), choices[0]] })?.id).toBe("hls");
  });
  it("handles audio-only and unsupported sources without fabricating video", () => {
    expect(autoPlayChoice({ title: "x", choices: [] })).toBeUndefined();
    expect(autoPlayChoice({ title: "x", choices: [choice("audio", "Audio", "audio")] })?.kind).toBe("audio");
  });
  it("records monotonic discovery, ready and actual first-render callbacks only once without URLs", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    let now = 0;
    const timing = submissionTiming(() => now);
    const track = choice("test").track, playable = { ...track };
    timing.attach(track);
    inheritPlaybackTiming(track, playable);
    now = 120; expect(markPlaybackTiming(playable, "discovery")).toBe(120);
    now = 180; expect(timing.mark("ready")).toBe(180);
    now = 210; expect(timing.mark("first-frame")).toBe(210);
    expect(timing.mark("first-frame")).toBeUndefined();
    expect(log).toHaveBeenCalledTimes(3);
    log.mockRestore();
  });
});
