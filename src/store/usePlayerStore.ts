import { create } from 'zustand';
import { AppState } from 'react-native';
import TrackPlayer, { Event, PlaybackState } from '@rntp/player';
import {
  setupTrackPlayer,
  toMediaItem,
  toNativeRepeatMode,
} from '../core/trackPlayerServices';
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
  initListeners: () => Promise<void>;
  playQueue: (tracks: Track[], startIndex: number) => Promise<void>;
  skipNext: () => void;
  skipPrev: () => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

let listenersBound = false;

export const usePlayerStore = create<PlayerState>((set, get) => {
  const findTrackByMediaId = (mediaId: string | null | undefined): Track | null =>
    get().queue.find((t) => t.id === mediaId) ?? null;

  const syncFromPlayer = () => {
    try {
      const progress = TrackPlayer.getProgress();
      const playing = TrackPlayer.isPlaying();
      const state = TrackPlayer.getPlaybackState();
      const index = TrackPlayer.getActiveMediaItemIndex();
      const active = TrackPlayer.getActiveMediaItem();

      set({
        isPlaying: playing,
        isLoading: state === PlaybackState.Buffering,
        currentIndex: index ?? get().currentIndex,
        currentTrack: active?.mediaId
          ? findTrackByMediaId(active.mediaId)
          : get().currentTrack,
        position: progress?.position ?? 0,
        duration: progress?.duration ?? get().duration,
      });

      const timer = TrackPlayer.getSleepTimer();
      if (timer && timer.type === 'time') {
        set({ sleepTimerEnd: Date.now() + timer.remainingSeconds * 1000 });
      } else if (!timer) {
        set({ sleepTimerEnd: null });
      }
    } catch (e) {
      console.warn('[usePlayerStore] Falha ao sincronizar estado do player:', e);
    }
  };

  const bindListeners = () => {
    if (listenersBound) return;
    listenersBound = true;

    TrackPlayer.addEventListener(Event.MediaItemTransition, ({ item, index }) => {
      set({
        currentIndex: index,
        currentTrack: item?.mediaId ? findTrackByMediaId(item.mediaId) : null,
        position: 0,
      });
    });

    TrackPlayer.addEventListener(Event.IsPlayingChanged, ({ playing }) => {
      set({ isPlaying: playing });
    });

    TrackPlayer.addEventListener(Event.PlaybackStateChanged, ({ state }) => {
      set({ isLoading: state === PlaybackState.Buffering });
      if (state === PlaybackState.Ended) {
        set({ isPlaying: false });
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position, duration }) => {
      set({ position, duration });
    });

    TrackPlayer.addEventListener(Event.PlaybackError, ({ code, message }) => {
      console.warn(`[usePlayerStore] Erro de playback [${code}]:`, message);
      set({ isLoading: false });
    });

    TrackPlayer.addEventListener(Event.SleepTimerTriggered, () => {
      set({ sleepTimerEnd: null });
    });

    // Re-sincroniza o estado quando o app volta para o foreground,
    // pois os controles da notificação podem ter mudado o player em background.
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncFromPlayer();
      }
    });

    return () => {
      appStateSub.remove();
      listenersBound = false;
    };
  };

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

    initListeners: async () => {
      await setupTrackPlayer();
      bindListeners();
      syncFromPlayer();
    },

    playQueue: async (tracks, startIndex) => {
      const { shuffleEnabled, repeatMode } = get();
      const initialTrack = tracks[startIndex] ?? null;

      set({
        originalQueue: tracks,
        queue: tracks,
        currentIndex: startIndex,
        currentTrack: initialTrack,
        position: 0,
        duration: 0,
        isPlaying: false,
        isLoading: true,
      });

      if (!initialTrack) return;

      await setupTrackPlayer();
      TrackPlayer.setMediaItems(tracks.map(toMediaItem), startIndex);
      TrackPlayer.setRepeatMode(toNativeRepeatMode(repeatMode));
      TrackPlayer.setShuffleEnabled(shuffleEnabled);
      TrackPlayer.play();
    },

    skipNext: () => {
      TrackPlayer.skipToNext();
    },

    skipPrev: () => {
      // Spotify behavior: se a música tocou por mais de 3s, volta ao início;
      // caso contrário, vai para a anterior.
      if (get().position > 3) {
        TrackPlayer.seekTo(0);
      } else {
        TrackPlayer.skipToPrevious();
      }
    },

    play: () => {
      TrackPlayer.play();
    },

    pause: () => {
      TrackPlayer.pause();
    },

    seekTo: (seconds) => {
      TrackPlayer.seekTo(seconds);
    },

    toggleShuffle: () => {
      const { shuffleEnabled, originalQueue, currentTrack } = get();
      const next = !shuffleEnabled;
      set({ shuffleEnabled: next });

      TrackPlayer.setShuffleEnabled(next);

      // Ao desligar o shuffle, restaura a ordem original mantendo a faixa atual
      if (!next && currentTrack) {
        const newIndex = Math.max(
          0,
          originalQueue.findIndex((t) => t.id === currentTrack.id)
        );
        set({ queue: originalQueue, currentIndex: newIndex });
      }
    },

    cycleRepeat: () => {
      const { repeatMode } = get();
      const next: RepeatMode =
        repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
      set({ repeatMode: next });
      TrackPlayer.setRepeatMode(toNativeRepeatMode(next));
    },

    setSleepTimer: (minutes) => {
      if (minutes === null) {
        TrackPlayer.cancelSleepTimer();
        set({ sleepTimerEnd: null });
      } else {
        TrackPlayer.sleepAfterTime(minutes * 60, { fadeOutSeconds: 10 });
        set({ sleepTimerEnd: Date.now() + minutes * 60 * 1000 });
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
