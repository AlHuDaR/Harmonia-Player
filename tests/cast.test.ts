import { describe, expect, it, vi } from "vitest";
import {
  castMedia,
  CastHandoff,
  EMPTY_CAST_STATE,
  youtubeCastMedia,
  canPrepareYouTubeCast,
  youtubeCastContentId,
} from "../utils/cast";
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

it("restores a receiver seek to zero exactly", async () => {
  const { handoff, local } = setup();
  await handoff.start();
  handoff.observe({
    ...EMPTY_CAST_STATE,
    connection: "connected",
    contentId: media.uri,
    position: 0,
  });
  await handoff.returnLocal();
  expect(local.seek).toHaveBeenLastCalledWith(0);
});

const youtube = { ...track, youtubeId: "abcdefghijk" };
const castId = youtubeCastContentId(youtube);
const candidate = () => ({
  uri: `https://rr1.googlevideo.com/videoplayback?expire=${Math.floor(Date.now() / 1000) + 3600}&signature=example`,
  contentType: "video/mp4" as const,
  contentId: castId,
  sourceToken: "9e93b9dc-3255-41fa-ac75-e8e07f270c37",
  expiresAt: Date.now() + 300000,
});
describe("separate YouTube Cast preparation", () => {
  it("admits a native-granted candidate without admitting the local Auto source", () => {
    expect(canPrepareYouTubeCast(youtube)).toBe(true);
    expect(
      canPrepareYouTubeCast({ ...youtube, localUri: "file:///download.mp4" }),
    ).toBe(false);
    expect(
      castMedia(youtube, { uri: "file:///phone/auto.mpd" }),
    ).toBeUndefined();
    expect(youtubeCastMedia(youtube, candidate())).toMatchObject({
      contentId: castId,
      title: track.title,
    });
    for (const value of [
      { ...candidate(), uri: "file:///phone/auto.mpd" },
      { ...candidate(), uri: "https://googlevideo.com.evil.com/videoplayback" },
      { ...candidate(), sourceToken: undefined },
      { ...candidate(), contentId: "another video" },
      { ...candidate(), expiresAt: Date.now() - 1 },
      { ...candidate(), contentType: "audio/mp4" as const },
      {
        ...candidate(),
        uri: candidate().uri.replace(/expire=\d+/, "expire=1"),
      },
    ])
      expect(() => youtubeCastMedia(youtube, value)).toThrow(
        "No compatible YouTube",
      );
  });
  it("keeps local playback during preparation and transfers its current position and intent", async () => {
    const { local, transport } = setup();
    let finish!: (media: any) => void;
    let position = 42;
    local.position = () => position;
    const resolve = vi.fn(
      () =>
        new Promise<any>((done) => {
          finish = done;
        }),
    );
    const handoff = new CastHandoff(undefined, transport, local, {
      contentId: castId,
      resolve,
    });
    const request = handoff.start();
    void handoff.start();
    expect(handoff.getSnapshot().preparing).toBe(true);
    expect(local.pause).not.toHaveBeenCalled();
    expect(resolve).toHaveBeenCalledTimes(1);
    position = 58;
    finish(youtubeCastMedia(youtube, candidate()));
    await request;
    expect(transport.load).toHaveBeenCalledWith(
      expect.objectContaining({ contentId: castId }),
      58,
      true,
    );
    expect(local.pause).toHaveBeenCalledTimes(1);
    expect(handoff.getSnapshot()).toMatchObject({
      preparing: false,
      active: true,
    });
  });
  it.each(["cancel", "dispose", "disconnect"])(
    "ignores late resolution after %s without touching local audio",
    async (action) => {
      const { local, transport } = setup();
      let finish!: (media: any) => void;
      let signal!: AbortSignal;
      const handoff = new CastHandoff(undefined, transport, local, {
        contentId: castId,
        resolve: (s) => {
          signal = s;
          return new Promise<any>((done) => {
            finish = done;
          });
        },
      });
      const request = handoff.start();
      if (action === "cancel") await handoff.returnLocal();
      else if (action === "dispose") handoff.dispose();
      else handoff.observe({ ...EMPTY_CAST_STATE, connection: "disconnected" });
      expect(signal.aborted).toBe(true);
      finish(youtubeCastMedia(youtube, candidate()));
      await request;
      expect(transport.load).not.toHaveBeenCalled();
      expect(local.pause).not.toHaveBeenCalled();
      expect(local.play).not.toHaveBeenCalled();
    },
  );
  it("does not pause local playback when no receiver-accessible stream is found", async () => {
    const { local, transport } = setup();
    const handoff = new CastHandoff(undefined, transport, local, {
      contentId: castId,
      resolve: async () => {
        throw new Error("No compatible stream");
      },
    });
    await handoff.start();
    expect(local.pause).not.toHaveBeenCalled();
    expect(transport.load).not.toHaveBeenCalled();
    expect(handoff.getSnapshot()).toMatchObject({
      preparing: false,
      active: false,
      error: "No compatible stream",
    });
  });
  it("preserves a pause made while the Cast source is being prepared", async () => {
    const { local, transport } = setup();
    let finish!: (media: any) => void;
    let playing = true;
    local.playing = () => playing;
    const handoff = new CastHandoff(undefined, transport, local, {
      contentId: castId,
      resolve: () =>
        new Promise<any>((done) => {
          finish = done;
        }),
    });
    const request = handoff.start();
    playing = false;
    finish(youtubeCastMedia(youtube, candidate()));
    await request;
    expect(transport.load).toHaveBeenCalledWith(expect.anything(), 42, false);
    handoff.dispose();
  });
  it("does not let a cancelled preparation replace a later transfer", async () => {
    const { local, transport } = setup();
    let finish!: (media: any) => void;
    const resolve = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<any>((done) => {
            finish = done;
          }),
      )
      .mockResolvedValue(youtubeCastMedia(youtube, candidate()));
    const handoff = new CastHandoff(undefined, transport, local, {
      contentId: castId,
      resolve,
    });
    const old = handoff.start();
    await handoff.returnLocal();
    await handoff.start();
    finish(youtubeCastMedia(youtube, candidate()));
    await old;
    expect(transport.load).toHaveBeenCalledTimes(1);
    expect(handoff.getSnapshot().active).toBe(true);
    handoff.dispose();
  });
  it("stops a rejected receiver load by stable content ID before resuming locally", async () => {
    const { local, transport } = setup();
    transport.load.mockRejectedValue(new Error("Receiver rejected"));
    const handoff = new CastHandoff(undefined, transport, local, {
      contentId: castId,
      resolve: async () => youtubeCastMedia(youtube, candidate()),
    });
    await handoff.start();
    expect(transport.stopOwned).toHaveBeenCalledWith(castId);
    expect(local.play).toHaveBeenCalledTimes(1);
    expect(transport.stopOwned.mock.invocationCallOrder[0]).toBeLessThan(
      local.play.mock.invocationCallOrder[0],
    );
  });
  it("adopts and stops a matching YouTube session without resolving a replacement signed URL", async () => {
    const { local, transport } = setup();
    const resolve = vi.fn();
    const handoff = new CastHandoff(undefined, transport, local, {
      contentId: castId,
      resolve,
    });
    handoff.adopt({
      ...EMPTY_CAST_STATE,
      connection: "connected",
      hasMedia: true,
      contentId: castId,
      position: 90,
    });
    expect(handoff.getSnapshot().active).toBe(true);
    expect(resolve).not.toHaveBeenCalled();
    expect(local.pause).toHaveBeenCalledTimes(1);
    await handoff.returnLocal();
    expect(transport.stopOwned).toHaveBeenCalledWith(castId);
    expect(local.seek).toHaveBeenCalledWith(90);
  });
});

describe("receiver loading timeout", () => {
  it("does not loop automatic STOP attempts when recovery fails", async () => {
    const { handoff, transport, local } = setup();
    transport.stopOwned.mockRejectedValue(new Error("Disconnected"));
    await handoff.start();
    const failed = {
      ...EMPTY_CAST_STATE,
      connection: "connected" as const,
      contentId: media.uri,
      idleReason: 4,
    };
    handoff.observe(failed);
    await Promise.resolve();
    await Promise.resolve();
    handoff.observe(failed);
    handoff.observe(failed);
    expect(transport.stopOwned).toHaveBeenCalledTimes(1);
    expect(local.play).not.toHaveBeenCalled();
    expect(handoff.getSnapshot().error).toContain("uncertain");
    handoff.dispose();
  });
  it("stops a receiver stuck buffering before offering paused local playback", async () => {
    vi.useFakeTimers();
    const { handoff, transport, local } = setup();
    try {
      await handoff.start();
      handoff.observe({
        ...EMPTY_CAST_STATE,
        connection: "connected",
        contentId: media.uri,
        hasMedia: true,
        buffering: true,
        position: 50,
      });
      await vi.advanceTimersByTimeAsync(30001);
      expect(transport.stopOwned).toHaveBeenCalledWith(media.uri);
      expect(local.seek).toHaveBeenLastCalledWith(50);
      expect(local.play).not.toHaveBeenCalled();
      expect(handoff.getSnapshot()).toMatchObject({
        active: false,
        error: "Receiver playback timed out. Local playback is available.",
      });
    } finally {
      handoff.dispose();
      vi.useRealTimers();
    }
  });
  it("checks fresh native state before timing out a healthy receiver after backgrounding", async () => {
    vi.useFakeTimers();
    const { transport, local } = setup();
    const getState = vi.fn().mockResolvedValue({
      ...EMPTY_CAST_STATE,
      connection: "connected",
      contentId: media.uri,
      hasMedia: true,
      buffering: false,
      playing: true,
    });
    const handoff = new CastHandoff(media, { ...transport, getState }, local);
    try {
      await handoff.start();
      await vi.advanceTimersByTimeAsync(30001);
      expect(getState).toHaveBeenCalledTimes(1);
      expect(transport.stopOwned).not.toHaveBeenCalled();
      expect(handoff.getSnapshot().active).toBe(true);
    } finally {
      handoff.dispose();
      vi.useRealTimers();
    }
  });
  it("does not time out normal end-of-video status", async () => {
    vi.useFakeTimers();
    const { handoff, transport } = setup();
    try {
      await handoff.start();
      handoff.observe({
        ...EMPTY_CAST_STATE,
        connection: "connected",
        contentId: media.uri,
        idleReason: 1,
      });
      await vi.advanceTimersByTimeAsync(30001);
      expect(transport.stopOwned).not.toHaveBeenCalled();
    } finally {
      handoff.dispose();
      vi.useRealTimers();
    }
  });
});
