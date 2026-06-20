import { create } from 'zustand';
import { audioService } from '../services/audioService';
import { Track } from '../core/entities';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  // Queue
  queue: Track[];
  originalQueue: Track[];
  currentIndex: number;

  // Playback
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number; // in seconds
  duration: number; // in seconds

  // Modes
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;

  // Sleep Timer
  sleepTimerEnd: number | null;
  setSleepTimer: (minutes: number | null) => void;

  // Equalizer
  eqPreset: string;
  eqBands: number[]; // 5 bands
  setEqPreset: (preset: string, bands?: number[]) => void;
  setEqBand: (index: number, value: number) => void;

  // Actions
  initListeners: () => void;
  playQueue: (tracks: Track[], startIndex: number) => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrev: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildShuffledQueue(tracks: Track[], startIndex: number): Track[] {
  const chosen = tracks[startIndex];
  const rest = tracks.filter((_, i) => i !== startIndex);
  return [chosen, ...shuffleArray(rest)];
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  const loadAndPlayTrack = async (track: Track) => {
    try {
      set({ isLoading: true, currentTrack: track, position: 0, duration: 0 });
      await audioService.load(track.file, (status) => {
        if (!status.isLoaded) {
          if (status.error) {
            console.error('[usePlayerStore] Playback status error:', status.error);
          }
          return;
        }

        const isPlaying = status.isPlaying;
        const isLoading = status.isBuffering;
        const position = status.positionMillis / 1000;
        const duration = status.durationMillis ? status.durationMillis / 1000 : 0;

        set({ isPlaying, isLoading, position, duration });

        if (status.didJustFinish) {
          const { repeatMode, queue, currentIndex, skipNext } = get();
          if (repeatMode === 'one') {
            audioService.seek(0).then(() => audioService.play());
          } else if (repeatMode === 'all') {
            skipNext();
          } else {
            if (currentIndex < queue.length - 1) {
              skipNext();
            } else {
              // End of queue
              audioService.pause().then(() => audioService.seek(0));
            }
          }
        }
      });
      await audioService.play();
    } catch (e) {
      console.error('[usePlayerStore] Error loading and playing track:', e);
      set({ isLoading: false });
    }
  };

  // Fade out loop for sleep timer
  setInterval(async () => {
    const { sleepTimerEnd, isPlaying } = get();
    if (!sleepTimerEnd || !isPlaying) return;

    const now = Date.now();
    const timeLeft = sleepTimerEnd - now;

    if (timeLeft <= 0) {
      await audioService.pause();
      await audioService.setVolume(1.0);
      set({ sleepTimerEnd: null });
    } else if (timeLeft <= 10000) {
      const volume = Math.max(0, timeLeft / 10000);
      await audioService.setVolume(volume);
    }
  }, 1000);

  return {
    queue: [],
    originalQueue: [],
    currentIndex: 0,
    currentTrack: null,
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    shuffleEnabled: false,
    repeatMode: 'off',
    sleepTimerEnd: null,
    eqPreset: 'Flat',
    eqBands: [0, 0, 0, 0, 0],

    initListeners: () => {
      audioService.init();
    },

    playQueue: async (tracks, startIndex) => {
      const { shuffleEnabled } = get();
      let activeQueue: Track[];

      if (shuffleEnabled) {
        activeQueue = buildShuffledQueue(tracks, startIndex);
      } else {
        activeQueue = tracks;
      }

      const initialIndex = shuffleEnabled ? 0 : startIndex;
      const initialTrack = activeQueue[initialIndex];

      set({
        originalQueue: tracks,
        queue: activeQueue,
        currentIndex: initialIndex,
        currentTrack: initialTrack || null,
        position: 0,
        duration: 0,
      });

      if (initialTrack) {
        await loadAndPlayTrack(initialTrack);
      }
    },

    skipNext: async () => {
      const { queue, currentIndex, repeatMode } = get();
      let nextIndex = currentIndex + 1;

      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return; // No more tracks in queue
        }
      }

      const nextTrack = queue[nextIndex];
      if (nextTrack) {
        set({ currentIndex: nextIndex });
        await loadAndPlayTrack(nextTrack);
      }
    },

    skipPrev: async () => {
      const { queue, currentIndex, position } = get();

      // If the current track has played for more than 3 seconds, restart it
      if (position > 3) {
        await audioService.seek(0);
        return;
      }

      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        if (get().repeatMode === 'all') {
          prevIndex = queue.length - 1;
        } else {
          // Restart first track
          await audioService.seek(0);
          return;
        }
      }

      const prevTrack = queue[prevIndex];
      if (prevTrack) {
        set({ currentIndex: prevIndex });
        await loadAndPlayTrack(prevTrack);
      }
    },

    play: async () => {
      const { currentTrack } = get();
      if (currentTrack) {
        await audioService.play();
      }
    },

    pause: async () => {
      await audioService.pause();
    },

    seekTo: async (seconds) => {
      await audioService.seek(seconds);
    },

    toggleShuffle: async () => {
      const { shuffleEnabled, queue, originalQueue, currentTrack } = get();
      const next = !shuffleEnabled;

      const idx = queue.findIndex(t => t.id === currentTrack?.id);

      let newQueue: Track[];
      let newIndex = 0;

      if (next) {
        newQueue = currentTrack ? buildShuffledQueue(queue, Math.max(0, idx)) : shuffleArray(queue);
      } else {
        newQueue = originalQueue;
        newIndex = originalQueue.findIndex((t) => t.id === currentTrack?.id);
        newIndex = Math.max(0, newIndex);
      }

      set({ shuffleEnabled: next, queue: newQueue, currentIndex: newIndex });
    },

    cycleRepeat: () => {
      const { repeatMode } = get();
      const next: RepeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
      set({ repeatMode: next });
    },

    setSleepTimer: (minutes) => {
      if (minutes === null) {
        set({ sleepTimerEnd: null });
        audioService.setVolume(1.0);
      } else {
        set({ sleepTimerEnd: Date.now() + minutes * 60 * 1000 });
        audioService.setVolume(1.0);
      }
    },

    setEqPreset: (preset, bands) => {
      if (bands) set({ eqPreset: preset, eqBands: bands });
      else set({ eqPreset: preset });
    },
    setEqBand: (index, value) => {
      const { eqBands } = get();
      const newBands = [...eqBands];
      newBands[index] = value;
      set({ eqBands: newBands, eqPreset: 'Custom' });
    },
  };
});
