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
    tracks: [],
    history: [],
    favorites: [],
    playlists: [],
    downloads: [],
    currentTrack: null,
  });
});
describe("persistent library", () => {
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
