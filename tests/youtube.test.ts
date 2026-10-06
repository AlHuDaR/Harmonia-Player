import { beforeEach, describe, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({
  search: vi.fn(), details: vi.fn(), formats: vi.fn(), resolve: vi.fn(), mux: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" }, NativeModules: { HarmoniaYouTube: native } }));
import { searchYouTube, resolveSource, youtubeId, youtubeTrack, formatTrack } from "../utils/youtube";
const track = { id: "youtube:abcdefghijk", youtubeId: "abcdefghijk", title: "Video", artist: "Channel", kind: "video" as const };
beforeEach(() => vi.resetAllMocks());
describe("on-device YouTube", () => {
  it("searches and forwards native page tokens without API keys or servers", async () => {
    native.search.mockResolvedValue({ tracks: [track], nextPage: "next" });
    expect((await searchYouTube("hello", "previous")).tracks).toEqual([track]);
    expect(native.search).toHaveBeenCalledWith("hello", "previous");
  });
  it("accepts known YouTube link forms and rejects unrelated hosts/credentials", () => {
    for (const link of ["https://youtu.be/abcdefghijk", "https://www.youtube.com/watch?v=abcdefghijk&t=10", "https://youtube.com/shorts/abcdefghijk", "https://m.youtube.com/live/abcdefghijk"]) expect(youtubeId(link)).toBe("abcdefghijk");
    for (const link of ["https://youtube.com.evil.test/watch?v=abcdefghijk", "https://u:p@youtube.com/watch?v=abcdefghijk", "http://youtu.be/abcdefghijk", "https://youtube.com/watch?v=short"]) expect(youtubeId(link)).toBeUndefined();
  });
  it("gets metadata for a pasted YouTube link", async () => {
    native.details.mockResolvedValue(track);
    expect(await youtubeTrack("https://youtu.be/abcdefghijk")).toEqual(track);
  });
  it("uses offline files before extraction and preserves media headers", async () => {
    expect(await resolveSource({ ...track, localUri: "file:///offline.mp4" })).toEqual({ uri: "file:///offline.mp4" });
    expect(native.resolve).not.toHaveBeenCalled();
    native.resolve.mockResolvedValue({ uri: "https://media.test/video", headers: { "User-Agent": "test" } });
    expect((await resolveSource(track)).headers).toEqual({ "User-Agent": "test" });
    expect(native.resolve).toHaveBeenCalledWith("abcdefghijk", null, "video", false);
  });
  it("allows local DASH playback but rejects local or insecure download sources", async () => {
    native.resolve.mockResolvedValue({ uri: "file:///cache/generated.mpd" });
    expect((await resolveSource(track)).uri).toContain(".mpd");
    await expect(resolveSource(track, undefined, true)).rejects.toThrow("unsupported");
    native.resolve.mockResolvedValue({ uri: "http://media.test/video" });
    await expect(resolveSource(track)).rejects.toThrow("unsupported");
    native.resolve.mockResolvedValue({ uri: "https://media.test/video", audioUri: "http://media.test/audio" });
    await expect(resolveSource(track, undefined, true)).rejects.toThrow("audio source");
  });
  it("cancels the JS wait and ignores late native completions", async () => {
    let finish!: (value: unknown) => void;
    native.search.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const controller = new AbortController();
    const request = searchYouTube("hello", undefined, controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow("cancelled");
    finish({ tracks: [track] });
    const already = new AbortController(); already.abort();
    await expect(searchYouTube("hello", undefined, already.signal)).rejects.toThrow("cancelled");
    expect(native.search).toHaveBeenCalledTimes(1);
  });
  it("stores distinct audio/video choices without persisting expiring stream URLs", () => {
    const audio = formatTrack({ ...track, uri: "https://expires.test/", localUri: "file:///old" }, { id: "audio:140", label: "M4A", kind: "audio", downloadable: true });
    const video = formatTrack(track, { id: "video:137", label: "1080p", kind: "video", downloadable: true });
    expect(audio.id).not.toBe(video.id);
    expect(audio.uri).toBeUndefined(); expect(audio.localUri).toBeUndefined();
    expect(audio.kind).toBe("audio");
  });
});
