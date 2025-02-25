import { create } from 'zustand';

interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
}

interface PlayerStore {
  currentTrack: Track | null;
  isPlaying: boolean;
  setCurrentTrack: (track: Track) => void;
  togglePlayback: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  currentTrack: null,
  isPlaying: false,
  setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: true }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));