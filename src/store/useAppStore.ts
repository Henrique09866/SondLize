import { create } from 'zustand';
import { Track, Folder } from '../core/entities';

interface AppState {
  // Library
  tracks: Track[];
  folders: Folder[];
  
  // Player
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  progress: number; // position in ms
  duration: number; // total duration in ms
  
  // Actions
  setTracks: (tracks: Track[]) => void;
  setFolders: (folders: Folder[]) => void;
  setCurrentTrack: (track: Track | null) => void;
  setQueue: (queue: Track[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial State
  tracks: [],
  folders: [],
  currentTrack: null,
  queue: [],
  isPlaying: false,
  progress: 0,
  duration: 0,

  // Simple Setters
  setTracks: (tracks) => set({ tracks }),
  setFolders: (folders) => set({ folders }),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setQueue: (queue) => set({ queue }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
}));
