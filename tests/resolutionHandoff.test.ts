import { afterEach, describe, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ discover: vi.fn() }));
vi.mock("react-native", () => ({ NativeModules: { HarmoniaMedia: native }, Platform: { OS: "android" } }));
import { discoverRemote, takeDiscoveredMedia } from "../utils/providerBridge";
import { resolveSource } from "../utils/youtube";
const page = "https://vimeo.com/987654";
const payload = (uri = "https://cdn.example.com/video.mp4") => JSON.stringify({ title: "Video", formats: [
  { id: "mp4", label: "720p MP4", kind: "video", uri, extension: "mp4", downloadable: true },
] });
const track = { id: "vimeo-test", title: "Video", artist: "Test", sourcePage: page, formatId: "mp4", kind: "video" as const };
afterEach(() => { takeDiscoveredMedia(page); vi.useRealTimers(); vi.clearAllMocks(); });
describe("validated ephemeral resolution handoff", () => {
  it("eliminates the second discovery but refreshes after playback failure or retry", async () => {
    native.discover.mockResolvedValue(payload());
    await discoverRemote(page);
    expect((await resolveSource(track)).uri).toContain("video.mp4");
    expect(native.discover).toHaveBeenCalledTimes(1);
    await resolveSource(track);
    expect(native.discover).toHaveBeenCalledTimes(2);
    await resolveSource(track);
    expect(native.discover).toHaveBeenCalledTimes(3);
    expect(track).not.toHaveProperty("uri");
  });
  it("expires after 15 seconds and never reuses known expired signed URLs", async () => {
    vi.useFakeTimers();
    native.discover.mockResolvedValue(payload());
    await discoverRemote(page);
    vi.advanceTimersByTime(15001);
    expect(takeDiscoveredMedia(page)).toBeUndefined();
    native.discover.mockResolvedValue(payload(`https://cdn.example.com/a.mp4?expire=${Math.floor(Date.now() / 1000)}`));
    await discoverRemote(page);
    expect(takeDiscoveredMedia(page)).toBeUndefined();
  });
  it("keeps download resolution fresh and preserves selected format validation", async () => {
    native.discover.mockResolvedValue(payload());
    await discoverRemote(page);
    await resolveSource(track, undefined, true);
    expect(native.discover).toHaveBeenCalledTimes(2);
    await expect(resolveSource({ ...track, formatId: "missing" })).rejects.toThrow("no longer available");
  });
  it("cancels the JS wait immediately and never caches a late native response", async () => {
    let finish!: (value: string) => void;
    native.discover.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const controller = new AbortController();
    const request = discoverRemote(page, controller.signal);
    await Promise.resolve();
    controller.abort();
    await expect(request).rejects.toThrow("cancelled");
    finish(payload());
    await Promise.resolve();
    expect(takeDiscoveredMedia(page)).toBeUndefined();
  });
  it("does not cache unsafe native URLs or failures", async () => {
    native.discover.mockResolvedValue(payload("https://127.0.0.1/private.mp4"));
    await expect(discoverRemote(page)).rejects.toThrow();
    expect(takeDiscoveredMedia(page)).toBeUndefined();
    native.discover.mockRejectedValue(Error("HTTP 403"));
    await expect(discoverRemote(page)).rejects.toThrow("HTTP 403");
    expect(takeDiscoveredMedia(page)).toBeUndefined();
  });
});
