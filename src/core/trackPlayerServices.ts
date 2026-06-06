import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
} from 'react-native-track-player';

/**
 * Configures and initializes the TrackPlayer instance.
 * Must be called as early as possible in the app lifecycle.
 */
export async function setupPlayer() {
  let isSetup = false;
  try {
    const currentState = await TrackPlayer.getPlaybackState();
    isSetup = currentState !== undefined;
  } catch {
    isSetup = false;
  }

  if (!isSetup) {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      // Media controls capabilities
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause],
    });
  }

  return isSetup;
}

/**
 * Service to handle background events from the OS, such as 
 * clicking "Play", "Pause", or "Next" on the lock screen.
 * This must be registered via TrackPlayer.registerPlaybackService
 */
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    if (event.position) {
      TrackPlayer.seekTo(event.position);
    }
  });
}
