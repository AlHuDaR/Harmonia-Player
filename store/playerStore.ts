import { classifyLink } from "@/utils/linkProviders";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizePreset, type ThemePreset } from "@/constants/themes";
import type { Track, Playlist, Download } from "@/types/media";
import { resumeKey, resumePosition, saveResume, type ResumePoint } from "@/utils/playbackResume";

export interface SavedLink {
  url: string;
  provider: string;
  savedAt: number;
}

interface PlayerStore {
  savedLinks: SavedLink[];
  saveLink: (link: Omit<SavedLink, "savedAt">) => void;
  removeSavedLink: (url: string) => void;
  currentTrack: Track | null;
  language: "en" | "ar";
  playbackList: Track[];
  playbackIndex: number;
  previousTracks: Track[];
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  playList: (tracks: Track[], index: number) => void;
  previous: () => void;
  expanded: boolean;
  queue: Track[];
  autoQueue: boolean;
  position: number;
  resumePoints: Record<string, ResumePoint>;
  rememberPosition: (track: Track, position: number, duration: number) => void;
  setExpanded: (expanded: boolean) => void;
  enqueue: (track: Track) => void;
  removeQueued: (index: number) => void;
  moveQueued: (index: number, delta: number) => void;
  advance: (related?: Track[], manual?: boolean) => void;
  switchFormat: (track: Track, position: number) => void;
  tracks: Track[];
  history: string[];
  favorites: string[];
  playlists: Playlist[];
  downloads: Download[];
  settings: {
    background: boolean;
    autoPip: boolean;
    theme: "light" | "dark" | "system";
    preset: ThemePreset;
    transparency: "subtle" | "solid";
    downloadKind: "audio" | "video";
    playbackSpeed: number;
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
      savedLinks: [],
      saveLink: (link) => {
        const checked = classifyLink(link.url);
        set((s) => ({
          savedLinks: [
            {
              url: checked.url,
              provider: checked.provider,
              savedAt: Date.now(),
            },
            ...s.savedLinks.filter((l) => {
              try { return classifyLink(l.url).url !== checked.url; }
              catch { return true; }
            }),
          ],
        }));
      },
      removeSavedLink: (url) =>
        set((s) => ({ savedLinks: s.savedLinks.filter((l) => l.url !== url) })),
      currentTrack: null,
      language: "en",
      playbackList: [],
      playbackIndex: -1,
      previousTracks: [],
      shuffle: false,
      repeat: "off",
      playList: (tracks, index) => {
        if (!tracks[index]) return;
        usePlayerStore.getState().setCurrentTrack(tracks[index]);
        set({
          playbackList: [...tracks],
          playbackIndex: index,
          queue: [],
          previousTracks: [],
        });
      },
      previous: () => {
        const s = usePlayerStore.getState();
        const prior = s.previousTracks.at(-1);
        const index = s.playbackIndex - 1;
        const track = prior || s.playbackList[index];
        if (!track) return;
        const list = s.playbackList,
          expanded = s.expanded;
        s.setCurrentTrack(track);
        set({
          playbackList: list,
          playbackIndex: list.findIndex((t) => t.id === track.id),
          expanded,
          previousTracks: s.previousTracks.slice(0, -1),
          queue: s.currentTrack ? [s.currentTrack, ...s.queue] : s.queue,
        });
      },
      expanded: false,
      queue: [],
      autoQueue: false,
      position: 0,
      resumePoints: {},
      rememberPosition: (track, position, duration) => set((s) => ({ resumePoints: saveResume(s.resumePoints, track, position, duration) })),
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
      advance: (related = [], manual = false) => {
        const s = usePlayerStore.getState();
        let index = s.playbackIndex + 1;
        if (s.shuffle && s.playbackList.length > 1) {
          const choices = s.playbackList
            .map((_, i) => i)
            .filter((i) => i !== s.playbackIndex);
          index = choices[Math.floor(Math.random() * choices.length)];
        } else if (index >= s.playbackList.length && s.repeat === "all")
          index = 0;
        const fromQueue = s.queue[0];
        const next =
          fromQueue ||
          s.playbackList[index] ||
          ((s.autoQueue || manual) && !s.playbackList.length
            ? related.find(
                (t) =>
                  !s.history.includes(t.id) &&
                  (!t.youtubeId || t.youtubeId !== s.currentTrack?.youtubeId),
              )
            : undefined);
        if (!next) return;
        s.setCurrentTrack(next);
        set({
          expanded: s.expanded,
          playbackList: s.playbackList,
          playbackIndex: fromQueue
            ? s.playbackList.findIndex((t) => t.id === next.id) >= 0
              ? s.playbackList.findIndex((t) => t.id === next.id)
              : s.playbackIndex
            : index,
          queue: fromQueue ? s.queue.slice(1) : s.queue,
          previousTracks: s.currentTrack
            ? [...s.previousTracks, s.currentTrack].slice(-100)
            : s.previousTracks,
        });
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
        theme: "system",
        preset: "harmonia",
        transparency: "subtle",
        downloadKind: "audio",
        playbackSpeed: 1,
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
            playbackList: [],
            playbackIndex: -1,
            previousTracks: [],
            expanded: true,
            position: resumePosition(s.resumePoints[resumeKey(playable)]),
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
          queue: s.queue.filter((t) => t.id !== id),
          previousTracks: s.previousTracks.filter((t) => t.id !== id),
          playbackList: s.playbackList.filter((t) => t.id !== id),
          playbackIndex: s.playbackList
            .filter((t) => t.id !== id)
            .findIndex((t) => t.id === s.currentTrack?.id),
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
      partialize: ({
        currentTrack,
        expanded,
        position,
        playbackList,
        playbackIndex,
        previousTracks,
        ...state
      }) => state,
      onRehydrateStorage: () => (state, error) => {
        useLibraryStatus.setState({ hydrated: !error, error: !!error });
        if (state) {
          // Additive v1 migration: preserve the original storage key and all media.
          // Revalidate saved URLs before rendering or passing them to Android.
          const savedUrls = new Set<string>();
          state.savedLinks = (
            Array.isArray(state.savedLinks) ? state.savedLinks : []
          ).flatMap((link) => {
            try {
              const checked = classifyLink(link.url);
              if (savedUrls.has(checked.url)) return [];
              savedUrls.add(checked.url);
              return [
                {
                  url: checked.url,
                  provider: checked.provider,
                  savedAt: Number.isFinite(link.savedAt) ? link.savedAt : 0,
                },
              ];
            } catch {
              return [];
            }
          });
          state.language = state.language === "ar" ? "ar" : "en";
          state.resumePoints = Object.fromEntries(Object.entries(state.resumePoints || {}).filter(([, point]) => point && resumePosition(point)).slice(0, 100));
          // Drop obsolete resolver/API credentials from existing installations.
          state.settings = {
            background: state.settings.background ?? true,
            autoPip: state.settings.autoPip ?? false,
            theme: ["light", "dark", "system"].includes(state.settings.theme)
              ? state.settings.theme
              : "system",
            preset: normalizePreset(state.settings.preset),
            transparency:
              state.settings.transparency === "solid" ? "solid" : "subtle",
            downloadKind:
              state.settings.downloadKind === "video" ? "video" : "audio",
            playbackSpeed: [0.75, 1, 1.25, 1.5, 2].includes(state.settings.playbackSpeed) ? state.settings.playbackSpeed : 1,
          };
          state.downloads = state.downloads.map((d) =>
            d.status === "downloading" && !d.nativeId
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
