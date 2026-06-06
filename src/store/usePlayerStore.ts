import { create } from 'zustand';
import TrackPlayer, { State, Event, Track as RNTrack } from 'react-native-track-player';
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

const mapToRNTrack = (t: Track): RNTrack => ({
  id: t.id,
  url: t.file,
  title: t.title,
  artist: t.artist || 'Artista Desconhecido',
  artwork: t.artwork,
});

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Fade out loop for sleep timer
  setInterval(async () => {
    const { sleepTimerEnd, isPlaying } = get();
    if (!sleepTimerEnd || !isPlaying) return;

    const now = Date.now();
    const timeLeft = sleepTimerEnd - now;
    
    if (timeLeft <= 0) {
      await TrackPlayer.pause();
      await TrackPlayer.setVolume(1.0);
      set({ sleepTimerEnd: null });
    } else if (timeLeft <= 10000) {
      const volume = Math.max(0, timeLeft / 10000);
      await TrackPlayer.setVolume(volume);
    }
  }, 1000);

  return {
    queue: [],
    originalQueue: [],
    currentIndex: 0,
    currentTrack: null,
    isPlaying: false,
    isLoading: false,
    shuffleEnabled: false,
    repeatMode: 'off',
    sleepTimerEnd: null,
    eqPreset: 'Flat',
    eqBands: [0, 0, 0, 0, 0],

    initListeners: () => {
      TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
        const isPlaying = event.state === State.Playing;
        const isLoading = event.state === State.Buffering || event.state === State.Connecting;
        set({ isPlaying, isLoading });

        if (isPlaying) {
          // Restore volume if we were fading out
          TrackPlayer.setVolume(1.0);
        }
      });

      TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
        if (event.index !== undefined) {
          const track = get().queue[event.index];
          set({ currentIndex: event.index, currentTrack: track || null });
        }
      });
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
      });
      
      await TrackPlayer.reset();
      await TrackPlayer.add(activeQueue.map(mapToRNTrack));
      await TrackPlayer.skip(initialIndex);
      await TrackPlayer.play();
    },

    skipNext: async () => {
      try {
        await TrackPlayer.skipToNext();
      } catch (e) {
        if (get().repeatMode === 'all') {
          await TrackPlayer.skip(0);
        }
      }
    },

    skipPrev: async () => {
      const progress = await TrackPlayer.getProgress();
      if (progress.position > 3) {
        await TrackPlayer.seekTo(0);
      } else {
        try {
          await TrackPlayer.skipToPrevious();
        } catch (e) {
          await TrackPlayer.seekTo(0);
        }
      }
    },

    play: async () => {
      await TrackPlayer.play();
    },

    pause: async () => {
      await TrackPlayer.pause();
    },

    seekTo: async (seconds) => {
      await TrackPlayer.seekTo(seconds);
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
      
      // Update TrackPlayer
      const currentPos = await TrackPlayer.getProgress();
      const isPlaying = get().isPlaying;
      
      await TrackPlayer.reset();
      await TrackPlayer.add(newQueue.map(mapToRNTrack));
      await TrackPlayer.skip(newIndex);
      await TrackPlayer.seekTo(currentPos.position);
      if (isPlaying) {
        await TrackPlayer.play();
      }
    },

    cycleRepeat: () => {
      // NOTE: RNTP RepeatMode values are different
      // RNTP.RepeatMode.Off, RNTP.RepeatMode.Track, RNTP.RepeatMode.Queue
      const { repeatMode } = get();
      const next: RepeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
      set({ repeatMode: next });
      
      // Sync with RNTP
      let rntpMode;
      if (next === 'off') rntpMode = 0; // RepeatMode.Off
      else if (next === 'all') rntpMode = 2; // RepeatMode.Queue
      else rntpMode = 1; // RepeatMode.Track
      
      TrackPlayer.setRepeatMode(rntpMode as any);
    },

    setSleepTimer: (minutes) => {
      if (minutes === null) {
        set({ sleepTimerEnd: null });
        TrackPlayer.setVolume(1.0);
      } else {
        set({ sleepTimerEnd: Date.now() + minutes * 60 * 1000 });
        TrackPlayer.setVolume(1.0);
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
