import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => storage.get(key) || null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
  },
}));
import { usePlayerStore, useLibraryStatus } from "../store/playerStore";
import { directTrack } from "../types/media";
beforeEach(() => {
  storage.clear();
  usePlayerStore.setState({
    savedLinks: [],
    tracks: [],
    history: [],
    favorites: [],
    playlists: [],
    downloads: [],
    currentTrack: null,
  });
});
describe("persistent library", () => {
  it("deduplicates legacy Instagram saved links without changing media or playlist identities", async () => {
    const legacy="https://instagram.com/reel/DerYMOFsvXQ/?igsh=old";
    const canonical="https://www.instagram.com/reel/DerYMOFsvXQ/";
    const media={...directTrack("https://example.com/a.mp3"),id:"legacy-track"};
    usePlayerStore.setState({savedLinks:[{url:legacy,provider:"Instagram",savedAt:1}],
      tracks:[media],history:[media.id],favorites:[media.id],playlists:[{id:"p",name:"Saved",trackIds:[media.id]}]});
    usePlayerStore.getState().saveLink({url:canonical+"?dlrf=new",provider:"Instagram"});
    expect(usePlayerStore.getState().savedLinks).toHaveLength(1);
    expect(usePlayerStore.getState().savedLinks[0].url).toBe(canonical);
    usePlayerStore.setState({savedLinks:[{url:legacy,provider:"Instagram",savedAt:2},{url:canonical,provider:"Instagram",savedAt:1}]});
    await usePlayerStore.persist.rehydrate();
    expect(usePlayerStore.getState().savedLinks).toEqual([{url:canonical,provider:"Instagram",savedAt:2}]);
    expect(usePlayerStore.getState()).toMatchObject({history:[media.id],favorites:[media.id],playlists:[{id:"p",trackIds:[media.id]}],tracks:[media]});
  });
  it("deduplicates history and tracks while maintaining recency", () => {
    const a = directTrack("https://example.com/a.mp3"),
      b = directTrack("https://example.com/b.mp3");
    const s = usePlayerStore.getState();
    s.setCurrentTrack(a);
    s.setCurrentTrack(b);
    s.setCurrentTrack(a);
    expect(usePlayerStore.getState().history).toEqual([a.id, b.id]);
    expect(usePlayerStore.getState().tracks).toHaveLength(2);
  });
  it("round-trips favorites and playlists without restoring autoplay", async () => {
    const t = directTrack("https://example.com/a.mp3");
    const s = usePlayerStore.getState();
    s.setCurrentTrack(t);
    s.toggleFavorite(t.id);
    s.createPlaylist(" Road trip ");
    const p = usePlayerStore.getState().playlists[0];
    s.addToPlaylist(p.id, t.id);
    s.addToPlaylist(p.id, t.id);
    const saved = storage.get("harmonia-library-v1")!;
    expect(JSON.parse(saved).state.currentTrack).toBeUndefined();
    usePlayerStore.setState({
      favorites: [],
      playlists: [],
      currentTrack: null,
    });
    storage.set("harmonia-library-v1", saved);
    await usePlayerStore.persist.rehydrate();
    expect(usePlayerStore.getState().favorites).toEqual([t.id]);
    expect(usePlayerStore.getState().playlists[0].trackIds).toEqual([t.id]);
    expect(usePlayerStore.getState().playlists[0].name).toBe("Road trip");
    expect(usePlayerStore.getState().currentTrack).toBeNull();
  });
  it("turns interrupted downloads into retryable failures on restart", async () => {
    const track = directTrack("https://example.com/a.mp3");
    usePlayerStore
      .getState()
      .setDownload({ track, status: "downloading", progress: 0.3 });
    await usePlayerStore.persist.rehydrate();
    expect(usePlayerStore.getState().downloads[0].status).toBe("failed");
  });
  it("clears the local file reference and stops a deleted active download", () => {
    const track = {
      ...directTrack("https://example.com/a.mp3"),
      localUri: "file:///saved.mp3",
    };
    const s = usePlayerStore.getState();
    s.setDownload({ track, status: "complete", progress: 1 });
    s.setCurrentTrack(track);
    s.removeDownload(track.id);
    expect(usePlayerStore.getState().currentTrack).toBeNull();
    expect(usePlayerStore.getState().tracks[0].localUri).toBeUndefined();
    expect(usePlayerStore.getState().downloads).toHaveLength(0);
  });
  it("reports unreadable saved data without replacing it", async () => {
    storage.set("harmonia-library-v1", "{invalid-json");
    await usePlayerStore.persist.rehydrate();
    expect(useLibraryStatus.getState().error).toBe(true);
    expect(storage.get("harmonia-library-v1")).toBe("{invalid-json");
  });
  it("prefers an existing offline download when reopening the same remote URL", () => {
    const track = directTrack("https://example.com/a.mp3");
    const s = usePlayerStore.getState();
    s.setDownload({
      track: { ...track, localUri: "file:///saved.mp3" },
      status: "complete",
      progress: 1,
    });
    s.addTrack(track);
    expect(usePlayerStore.getState().tracks[0].localUri).toBe(
      "file:///saved.mp3",
    );
    s.setCurrentTrack(track);
    expect(usePlayerStore.getState().currentTrack?.localUri).toBe(
      "file:///saved.mp3",
    );
  });
});

describe("playback navigation and queue", () => {
  beforeEach(() =>
    usePlayerStore.setState({
      queue: [],
      autoQueue: false,
      expanded: false,
      position: 0,
    }),
  );
  it("plays queued items before recommendations and preserves collapsed mode", () => {
    const a = directTrack("https://example.com/a.mp3"),
      b = directTrack("https://example.com/b.mp3"),
      c = directTrack("https://example.com/c.mp3");
    const s = usePlayerStore.getState();
    s.setCurrentTrack(a);
    s.enqueue(b);
    s.setExpanded(false);
    s.advance([c]);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(b.id);
    expect(usePlayerStore.getState().expanded).toBe(false);
    expect(usePlayerStore.getState().queue).toEqual([]);
    s.advance([c]);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(b.id);
    usePlayerStore.setState({ autoQueue: true });
    s.advance([a, c]);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(c.id);
  });
  it("reorders and removes queue entries without changing playback", () => {
    const a = directTrack("https://example.com/a.mp3"),
      b = directTrack("https://example.com/b.mp3");
    const s = usePlayerStore.getState();
    s.setCurrentTrack(a);
    s.enqueue(a);
    s.enqueue(b);
    s.moveQueued(1, -1);
    s.removeQueued(1);
    expect(usePlayerStore.getState().queue).toEqual([b]);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(a.id);
  });
  it("keeps resume position transient across quality changes", () => {
    const s = usePlayerStore.getState(),
      a = directTrack("https://example.com/a.mp4");
    s.setCurrentTrack(a);
    s.switchFormat({ ...a, id: "quality" }, 42);
    expect(usePlayerStore.getState().position).toBe(42);
    const saved = JSON.parse(storage.get("harmonia-library-v1")!).state;
    expect(saved.position).toBeUndefined();
    expect(saved.expanded).toBeUndefined();
    s.setCurrentTrack(a);
    expect(usePlayerStore.getState().position).toBe(0);
  });
});

describe("list transport", () => {
  const list = [0, 1, 2].map((n) => ({
    ...directTrack(`https://example.com/${n}.mp4`),
    localUri: `file:///saved-${n}.mp4`,
  }));
  beforeEach(() =>
    usePlayerStore.setState({
      queue: [],
      previousTracks: [],
      playbackList: [],
      playbackIndex: -1,
      shuffle: false,
      repeat: "off",
    }),
  );
  it("advances and returns through offline downloads without losing the list", () => {
    const s = usePlayerStore.getState();
    s.playList(list, 0);
    s.advance();
    expect(usePlayerStore.getState().currentTrack?.localUri).toBe(
      list[1].localUri,
    );
    s.previous();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(list[0].id);
    s.advance();
    s.advance();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(list[2].id);
    s.advance();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(list[2].id);
  });
  it("wraps only when repeat all is enabled and skips current item when shuffling", () => {
    const s = usePlayerStore.getState();
    s.playList(list, 2);
    usePlayerStore.setState({ repeat: "all" });
    s.advance();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(list[0].id);
    usePlayerStore.setState({ shuffle: true });
    s.advance();
    expect(usePlayerStore.getState().currentTrack?.id).not.toBe(list[0].id);
  });
  it("removes deleted downloads from pending playback", () => {
    const s = usePlayerStore.getState();
    s.playList(list, 0);
    s.enqueue(list[1]);
    s.removeDownload(list[1].id);
    s.advance();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(list[2].id);
  });
  it("persists language without restoring an active playback list", async () => {
    usePlayerStore.setState({ language: "ar" });
    usePlayerStore.getState().playList(list, 1);
    const saved = JSON.parse(storage.get("harmonia-library-v1")!).state;
    expect(saved.language).toBe("ar");
    expect(saved.playbackList).toBeUndefined();
    await usePlayerStore.persist.rehydrate();
    expect(usePlayerStore.getState().language).toBe("ar");
  });
});

describe("release preference migration", () => {
  it("adds preference defaults to an older library without losing saved media", async () => {
    const track = {
      ...directTrack("https://example.com/retained.mp3"),
      localUri: "file:///documents/imports/retained.mp3",
    };
    const savedState = {
      tracks: [track],
      history: [track.id],
      favorites: [track.id],
      playlists: [{ id: "saved", name: "Keep", trackIds: [track.id] }],
      downloads: [{ track, status: "complete", progress: 1 }],
      settings: { background: false, autoPip: true },
      language: "ar",
    };
    storage.set(
      "harmonia-library-v1",
      JSON.stringify({ state: savedState, version: 0 }),
    );
    await usePlayerStore.persist.rehydrate();
    const state = usePlayerStore.getState();
    expect(state.settings).toEqual({
      playbackSpeed: 1,
      background: false,
      autoPip: true,
      theme: "system",
      preset: "harmonia",
      transparency: "subtle",
      downloadKind: "audio",
    });
    for (const key of [
      "tracks",
      "downloads",
      "playlists",
      "favorites",
      "history",
      "language",
    ] as const)
      expect(state[key]).toEqual(savedState[key]);
  });
  it("persists appearance and format preferences across a restart", async () => {
    usePlayerStore.getState().updateSettings({
      theme: "light",
      transparency: "solid",
      downloadKind: "video",
    });
    const saved = storage.get("harmonia-library-v1")!;
    usePlayerStore.getState().updateSettings({
      theme: "dark",
      transparency: "subtle",
      downloadKind: "audio",
    });
    storage.set("harmonia-library-v1", saved);
    await usePlayerStore.persist.rehydrate();
    expect(usePlayerStore.getState().settings).toMatchObject({
      theme: "light",
      transparency: "solid",
      downloadKind: "video",
    });
  });
});

it("retains theme presets on restart and falls back safely for unknown presets", async () => {
  const s = usePlayerStore.getState();
  s.updateSettings({ preset: "ocean", theme: "dark" });
  const saved = storage.get("harmonia-library-v1")!;
  s.updateSettings({ preset: "sunset" });
  storage.set("harmonia-library-v1", saved);
  await usePlayerStore.persist.rehydrate();
  expect(usePlayerStore.getState().settings.preset).toBe("ocean");
  const unknown = JSON.parse(saved);
  unknown.state.settings.preset = "unknown";
  storage.set("harmonia-library-v1", JSON.stringify(unknown));
  await usePlayerStore.persist.rehydrate();
  expect(usePlayerStore.getState().settings.preset).toBe("harmonia");
});

it("restores a v1 library with no savedLinks and round-trips saved links independently", async () => {
  usePlayerStore.setState({ savedLinks: [] });
  storage.set(
    "harmonia-library-v1",
    JSON.stringify({
      version: 0,
      state: {
        tracks: [],
        history: ["keep"],
        playlists: [{ id: "p", name: "Keep", trackIds: ["keep"] }],
        favorites: ["keep"],
        downloads: [],
        settings: { background: true },
      },
    }),
  );
  await usePlayerStore.persist.rehydrate();
  expect(usePlayerStore.getState().savedLinks).toEqual([]);
  const s = usePlayerStore.getState();
  s.saveLink({ url: "https://instagram.com/reel/123", provider: "Instagram" });
  s.saveLink({ url: "https://instagram.com/reel/123", provider: "Instagram" });
  await usePlayerStore.persist.rehydrate();
  expect(usePlayerStore.getState().savedLinks).toHaveLength(1);
  expect(usePlayerStore.getState().playlists[0].trackIds).toEqual(["keep"]);
  expect(usePlayerStore.getState().history).toEqual(["keep"]);
  s.removeSavedLink("https://instagram.com/reel/123");
  expect(usePlayerStore.getState().savedLinks).toEqual([]);
});

it("rejects unsafe saved links and sanitizes persisted link entries", async () => {
  const s = usePlayerStore.getState();
  expect(() =>
    s.saveLink({ url: "https://127.0.0.1/a.mp4", provider: "fake" }),
  ).toThrow();
  s.saveLink({ url: "https://vimeo.com/123", provider: "fake" });
  const saved = JSON.parse(storage.get("harmonia-library-v1")!);
  saved.state.savedLinks.push(
    { url: "file:///etc/passwd", provider: "fake" },
    null,
  );
  storage.set("harmonia-library-v1", JSON.stringify(saved));
  await usePlayerStore.persist.rehydrate();
  expect(usePlayerStore.getState().savedLinks).toEqual([
    expect.objectContaining({
      url: "https://vimeo.com/123",
      provider: "Vimeo",
    }),
  ]);
});
