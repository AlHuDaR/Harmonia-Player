import { beforeEach, describe, expect, it, vi } from "vitest";
const bridge = vi.hoisted(() => ({
  prepareLocal: vi.fn(),
  cancelLocal: vi.fn(),
}));
const youtube = vi.hoisted(() => ({ resolveCast: vi.fn() }));
vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  NativeModules: { HarmoniaCast: bridge, HarmoniaYouTube: youtube },
}));
import { resolveLocalCast } from "../utils/localCast";
import {
  canPrepareLocalCast,
  canPrepareYouTubeCast,
  localCastContentId,
  localCastMedia,
  CastHandoff,
  EMPTY_CAST_STATE,
} from "../utils/cast";
const track = {
  id: "saved",
  title: "Saved song",
  artist: "Artist",
  kind: "audio" as const,
  youtubeId: "abcdefghijk",
  localUri: "file:///app/files/media-jobs/song.m4a",
};
const candidate = () => ({
  uri: `http://192.168.1.5:34567/cast/${"a".repeat(64)}/media.m4a`,
  contentType: "audio/mp4" as const,
  contentId: localCastContentId(track),
  localToken: "9e93b9dc-3255-41fa-ac75-e8e07f270c37",
});
beforeEach(() => vi.resetAllMocks());
describe("downloaded media Cast", () => {
  it("uses the downloaded file even when YouTube metadata is present", async () => {
    expect(canPrepareLocalCast(track)).toBe(true);
    expect(canPrepareYouTubeCast(track)).toBe(false);
    bridge.prepareLocal.mockResolvedValue(candidate());
    expect(
      await resolveLocalCast(track, new AbortController().signal),
    ).toMatchObject({
      contentId: localCastContentId(track),
      title: track.title,
    });
    expect(bridge.prepareLocal).toHaveBeenCalledWith(
      track.localUri,
      "audio",
      localCastContentId(track),
      expect.any(String),
      track.title,
    );
    expect(youtube.resolveCast).not.toHaveBeenCalled();
  });
  it("keeps playback identity stable without publishing the file path", () => {
    const id = localCastContentId(track);
    expect(id).toMatch(/^harmonia:local:[a-f0-9]{16}:audio$/);
    expect(localCastContentId({ ...track, title: "renamed" })).toBe(id);
    expect(
      localCastContentId({ ...track, localUri: "file:///another.m4a" }),
    ).not.toBe(id);
    expect(id).not.toContain("files");
  });
  it("requires the native host grant and a literal scoped LAN endpoint", () => {
    expect(localCastMedia(track, candidate()).contentType).toBe("audio/mp4");
    for (const bad of [
      { ...candidate(), localToken: undefined },
      { ...candidate(), contentId: "different" },
      { ...candidate(), uri: "file:///private.mp3" },
      {
        ...candidate(),
        uri: candidate().uri.replace("192.168.1.5", "localhost"),
      },
      {
        ...candidate(),
        uri: candidate().uri.replace("192.168.1.5", "127.0.0.1"),
      },
      { ...candidate(), uri: candidate().uri.replace("/cast/", "/private/") },
      { ...candidate(), uri: candidate().uri + "?file=private" },
    ])
      expect(() => localCastMedia(track, bad)).toThrow("downloaded file");
  });
  it("cancels the matching file host preparation and ignores late results", async () => {
    let done!: (value: unknown) => void;
    bridge.prepareLocal.mockImplementation(
      () =>
        new Promise((resolve) => {
          done = resolve;
        }),
    );
    const abort = new AbortController();
    const request = resolveLocalCast(track, abort.signal);
    abort.abort();
    await expect(request).rejects.toThrow("cancelled");
    expect(bridge.cancelLocal).toHaveBeenCalledWith(
      bridge.prepareLocal.mock.calls[0][3],
    );
    done(candidate());
  });
  it("bounds preparation without exposing private paths in errors", async () => {
    vi.useFakeTimers();
    try {
      bridge.prepareLocal.mockReturnValue(new Promise(() => {}));
      const request = resolveLocalCast(track, new AbortController().signal);
      const rejected = expect(request).rejects.toThrow("timed out");
      await vi.advanceTimersByTimeAsync(30001);
      await rejected;
      expect(bridge.cancelLocal).toHaveBeenCalled();
      bridge.prepareLocal.mockRejectedValue(new Error("/private/app/secret"));
      await expect(
        resolveLocalCast(track, new AbortController().signal),
      ).rejects.toThrow("This downloaded file");
    } finally {
      vi.useRealTimers();
    }
  });
  it("does not adopt a stale receiver URL after the phone's file host has stopped", () => {
    const transport = {
      load: vi.fn(),
      stopOwned: vi.fn().mockResolvedValue(undefined),
    };
    const local = {
      position: () => 0,
      playing: () => true,
      pause: vi.fn(),
      play: vi.fn(),
      seek: vi.fn(),
    };
    const handoff = new CastHandoff(undefined, transport, local, {
      contentId: localCastContentId(track),
      resolve: vi.fn(),
      canAdopt: (state) => state.localSourceActive,
    });
    const remote = {
      ...EMPTY_CAST_STATE,
      connection: "connected" as const,
      contentId: localCastContentId(track),
      hasMedia: true,
    };
    handoff.adopt(remote);
    expect(handoff.getSnapshot().active).toBe(false);
    expect(local.pause).not.toHaveBeenCalled();
    handoff.adopt({ ...remote, localSourceActive: true });
    expect(handoff.getSnapshot().active).toBe(true);
    handoff.dispose();
  });
});
