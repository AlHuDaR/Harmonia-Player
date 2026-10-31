import { describe, expect, it, vi } from "vitest";
import { castMedia, CastHandoff, EMPTY_CAST_STATE } from "../utils/cast";
const track = {
  id: "movie",
  title: "Movie",
  artist: "Library",
  kind: "video" as const,
};
const source = { uri: "https://media.example.com/movie.mp4" };
const media = castMedia(track, source)!;
function setup() {
  const transport = {
    load: vi.fn().mockResolvedValue(undefined),
    stopOwned: vi.fn().mockResolvedValue(undefined),
  };
  const local = {
    position: () => 42,
    playing: () => true,
    pause: vi.fn(),
    play: vi.fn(),
    seek: vi.fn(),
  };
  return {
    transport,
    local,
    handoff: new CastHandoff(media, transport, local),
  };
}
describe("Cast source limits", () => {
  it("accepts public HTTPS MP4/HLS candidates", () => {
    expect(media.contentType).toBe("video/mp4");
    expect(
      castMedia(track, { uri: "https://media.example.com/master.m3u8" })
        ?.contentType,
    ).toBe("application/x-mpegURL");
  });
  it("preserves extraction, local, authenticated, signed, separate and DASH playback on the sender", () => {
    for (const candidate of [
      { ...track, localUri: "file:///a.mp4" },
      { ...track, youtubeId: "abcdefghijk" },
      { ...track, sourcePage: "https://instagram.com/reel/x" },
      { ...track, provider: "Facebook" },
    ])
      expect(castMedia(candidate, source)).toBeUndefined();
    for (const uri of [
      "file:///tmp/auto.mpd",
      "http://media.example.com/a.mp4",
      "https://localhost/a.mp4",
      "https://127.0.0.1/a.mp4",
      "https://192.168.1.2/a.mp4",
      "https://tv.local/a.mp4",
      "https://u:p@media.example.com/a.mp4",
      "https://media.example.com/a.mp4?token=x",
      "https://media.example.com/a.mp4?",
      "https://media.example.com/a.mpd",
      "https://media.example.com/a.webm",
    ])
      expect(castMedia(track, { uri })).toBeUndefined();
    expect(
      castMedia(track, { ...source, headers: { Authorization: "secret" } }),
    ).toBeUndefined();
    expect(
      castMedia(track, {
        ...source,
        audioUri: "https://media.example.com/audio.m4a",
      }),
    ).toBeUndefined();
  });
});
describe("receiver and local audio ownership", () => {
  it("pauses before load, carries position/intent, and prevents duplicate loads", async () => {
    const { handoff, local, transport } = setup();
    const request = handoff.start();
    handoff.start();
    expect(local.pause).toHaveBeenCalledTimes(1);
    expect(transport.load).toHaveBeenCalledWith(media, 42, true);
    expect(local.pause.mock.invocationCallOrder[0]).toBeLessThan(
      transport.load.mock.invocationCallOrder[0],
    );
    await request;
    expect(handoff.getSnapshot()).toMatchObject({
      active: true,
      loading: false,
    });
    expect(local.play).not.toHaveBeenCalled();
  });
  it("stops a rejected load before restoring local playback", async () => {
    const { handoff, local, transport } = setup();
    transport.load.mockRejectedValue(new Error("Unsupported codec"));
    await handoff.start();
    expect(transport.stopOwned).toHaveBeenCalledWith(media.uri);
    expect(transport.stopOwned.mock.invocationCallOrder[0]).toBeLessThan(
      local.play.mock.invocationCallOrder[0],
    );
    expect(local.seek).toHaveBeenCalledWith(42);
    expect(handoff.getSnapshot()).toMatchObject({
      active: false,
      error: "Unsupported codec",
    });
  });
  it("does not resume local audio if the receiver stop fails", async () => {
    const { handoff, local, transport } = setup();
    transport.load.mockRejectedValue(new Error("Timeout"));
    transport.stopOwned.mockRejectedValue(new Error("Offline"));
    await handoff.start();
    expect(local.play).not.toHaveBeenCalled();
    expect(handoff.getSnapshot()).toMatchObject({
      active: true,
      loading: false,
    });
    expect(handoff.getSnapshot().error).toContain("uncertain");
  });
  it("holds local audio on suspension, reconnects, and requires Play after disconnect", async () => {
    const { handoff, local, transport } = setup();
    await handoff.start();
    handoff.observe({
      ...EMPTY_CAST_STATE,
      connection: "connected",
      contentId: media.uri,
      position: 80,
    });
    handoff.observe({ ...EMPTY_CAST_STATE, connection: "suspended" });
    expect(handoff.getSnapshot().active).toBe(true);
    handoff.observe({
      ...EMPTY_CAST_STATE,
      connection: "connected",
      contentId: media.uri,
      position: 82,
    });
    handoff.observe({ ...EMPTY_CAST_STATE, connection: "disconnected" });
    expect(local.seek).toHaveBeenLastCalledWith(82);
    expect(local.play).not.toHaveBeenCalled();
    expect(transport.load).toHaveBeenCalledTimes(1);
    expect(handoff.getSnapshot().active).toBe(false);
  });
  it("ignores a late load after a source change and stops owned media", async () => {
    const { handoff, local, transport } = setup();
    let finish!: () => void;
    transport.load.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const request = handoff.start();
    handoff.dispose();
    finish();
    await request;
    expect(transport.stopOwned).toHaveBeenCalledWith(media.uri);
    expect(handoff.getSnapshot().active).toBe(false);
    expect(local.play).not.toHaveBeenCalled();
  });
  it("returns to the last receiver position in a paused state", async () => {
    const { handoff, local } = setup();
    await handoff.start();
    handoff.observe({
      ...EMPTY_CAST_STATE,
      connection: "connected",
      contentId: media.uri,
      position: 91,
    });
    await handoff.returnLocal();
    expect(local.seek).toHaveBeenLastCalledWith(91);
    expect(local.play).not.toHaveBeenCalled();
    expect(handoff.getSnapshot().active).toBe(false);
  });
  it("does not touch local playback for an unsupported source or unavailable environment", async () => {
    const { local, transport } = setup();
    const handoff = new CastHandoff(undefined, transport, local);
    await handoff.start();
    expect(transport.load).not.toHaveBeenCalled();
    expect(local.pause).not.toHaveBeenCalled();
    expect(EMPTY_CAST_STATE.available).toBe(false);
  });
  it("adopts matching reconnect media without sending a duplicate load", () => {
    const { handoff, local, transport } = setup();
    handoff.adopt({
      ...EMPTY_CAST_STATE,
      connection: "connected",
      contentId: media.uri,
      position: 90,
      hasMedia: true,
    });
    expect(handoff.getSnapshot().active).toBe(true);
    expect(local.pause).toHaveBeenCalled();
    expect(transport.load).not.toHaveBeenCalled();
  });
});
