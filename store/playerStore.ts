import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Track, Playlist, Download } from "@/types/media";

interface PlayerStore {
  currentTrack: Track | null;
  tracks: Track[];
  history: string[];
  favorites: string[];
  playlists: Playlist[];
  downloads: Download[];
  settings: {
    youtubeApiKey: string;
    resolverUrl: string;
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
      tracks: [],
      history: [],
      favorites: [],
      playlists: [],
      downloads: [],
      settings: {
        youtubeApiKey: "",
        resolverUrl: "",
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
          if (!track) return { currentTrack: null };
          const downloaded = s.downloads.find(
            (d) => d.track.id === track.id && d.status === "complete",
          )?.track;
          const playable = {
            ...track,
            localUri: track.localUri || downloaded?.localUri,
          };
          return {
            currentTrack: playable,
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
      partialize: ({ currentTrack, ...state }) => state,
      onRehydrateStorage: () => (state, error) => {
        useLibraryStatus.setState({ hydrated: !error, error: !!error });
        if (state)
          state.downloads = state.downloads.map((d) =>
            d.status === "downloading"
              ? {
                  ...d,
                  status: "failed",
                  error: "Download interrupted. Retry to start again.",
                }
              : d,
          );
      },
    },
  ),
);
