import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Track, Playlist, Download } from "@/types/media";

interface PlayerStore {
  currentTrack: Track | null;
  expanded: boolean;
  queue: Track[];
  autoQueue: boolean;
  position: number;
  setExpanded: (expanded: boolean) => void;
  enqueue: (track: Track) => void;
  removeQueued: (index: number) => void;
  moveQueued: (index: number, delta: number) => void;
  advance: (related?: Track[]) => void;
  switchFormat: (track: Track, position: number) => void;
  tracks: Track[];
  history: string[];
  favorites: string[];
  playlists: Playlist[];
  downloads: Download[];
  settings: {
    background: boolean;
    autoPip: boolean;
  };
  setCurrentTrack: (track: Track | null) => void;
  addTrack: (track: Track) => void;
  toggleFavorite: (id: string) => void;
  createPlaylist: (name: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  deletePlaylist: (id: string) => void;
  setDownload: (download: Download) => void;
  removeDownload: (id: string) => void;
  updateSettings: (settings: Partial<PlayerStore["settings"]>) => void;
  clearHistory: () => void;
}
export const useLibraryStatus = create<{ hydrated: boolean; error: boolean }>(
  () => ({ hydrated: false, error: false }),
);

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      currentTrack: null,
      expanded: false,
      queue: [],
      autoQueue: false,
      position: 0,
      setExpanded: (expanded) => set({ expanded }),
      enqueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
      removeQueued: (index) =>
        set((s) => ({ queue: s.queue.filter((_, i) => i !== index) })),
      moveQueued: (index, delta) =>
        set((s) => {
          const queue = [...s.queue],
            target = index + delta;
          if (target < 0 || target >= queue.length) return {};
          [queue[index], queue[target]] = [queue[target], queue[index]];
          return { queue };
        }),
      advance: (related = []) => {
        const s = usePlayerStore.getState();
        const next =
          s.queue[0] ||
          (s.autoQueue
            ? related.find(
                (t) =>
                  !s.history.includes(t.id) &&
                  (!t.youtubeId || t.youtubeId !== s.currentTrack?.youtubeId),
              )
            : undefined);
        if (!next) return;
        const expanded = s.expanded;
        set({ queue: s.queue.slice(1) });
        s.setCurrentTrack(next);
        set({ expanded });
      },
      switchFormat: (track, position) => set({ currentTrack: track, position }),
      tracks: [],
      history: [],
      favorites: [],
      playlists: [],
      downloads: [],
      settings: {
        background: true,
        autoPip: false,
      },
      addTrack: (track) =>
        set((s) => ({
          tracks: [
            ...s.tracks.filter((t) => t.id !== track.id),
            { ...s.tracks.find((t) => t.id === track.id), ...track },
          ],
        })),
      setCurrentTrack: (track) =>
        set((s) => {
          if (!track)
            return { currentTrack: null, expanded: false, position: 0 };
          const downloaded = s.downloads.find(
            (d) => d.track.id === track.id && d.status === "complete",
          )?.track;
          const playable = {
            ...track,
            localUri: track.localUri || downloaded?.localUri,
          };
          return {
            currentTrack: playable,
            expanded: true,
            position: 0,
            tracks: [...s.tracks.filter((t) => t.id !== track.id), playable],
            history: [
              track.id,
              ...s.history.filter((id) => id !== track.id),
            ].slice(0, 100),
          };
        }),
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [...s.favorites, id],
        })),
      createPlaylist: (name) =>
        set((s) => ({
          playlists: [
            ...s.playlists,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              name: name.trim(),
              trackIds: [],
            },
          ],
        })),
      addToPlaylist: (id, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id
              ? { ...p, trackIds: [...new Set([...p.trackIds, trackId])] }
              : p,
          ),
        })),
      removeFromPlaylist: (id, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id
              ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) }
              : p,
          ),
        })),
      deletePlaylist: (id) =>
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),
      setDownload: (download) =>
        set((s) => ({
          downloads: [
            ...s.downloads.filter((d) => d.track.id !== download.track.id),
            download,
          ],
          tracks: [
            ...s.tracks.filter((t) => t.id !== download.track.id),
            download.track,
          ],
        })),
      removeDownload: (id) =>
        set((s) => ({
          downloads: s.downloads.filter((d) => d.track.id !== id),
          tracks: s.tracks.map((t) =>
            t.id === id ? { ...t, localUri: undefined } : t,
          ),
          currentTrack: s.currentTrack?.id === id ? null : s.currentTrack,
        })),
      updateSettings: (settings) =>
        set((s) => ({ settings: { ...s.settings, ...settings } })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "harmonia-library-v1",
      storage: createJSONStorage(() => AsyncStorage),
      // Never auto-play or restore expiring media URLs after restart.
      partialize: ({ currentTrack, expanded, position, ...state }) => state,
      onRehydrateStorage: () => (state, error) => {
        useLibraryStatus.setState({ hydrated: !error, error: !!error });
        if (state) {
          // Drop obsolete resolver/API credentials from existing installations.
          state.settings = {
            background: state.settings.background ?? true,
            autoPip: state.settings.autoPip ?? false,
          };
          state.downloads = state.downloads.map((d) =>
            d.status === "downloading"
              ? {
                  ...d,
                  status: "failed",
                  error: "Download interrupted. Retry to start again.",
                }
              : d,
          );
        }
      },
    },
  ),
);
