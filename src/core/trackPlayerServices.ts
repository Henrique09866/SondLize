import TrackPlayer, {
  PlayerCommand,
  RepeatMode,
  type MediaItem,
} from '@rntp/player';
import { Track } from './entities';

let playerReady = false;

/**
 * Inicializa o player nativo (MediaSession) uma única vez.
 *
 * A notificação de mídia com controles de ícones (play/pause/anterior/próxima)
 * e capa da música é gerenciada nativamente pelo Android/iOS — igual ao Spotify.
 */
export async function setupTrackPlayer(): Promise<void> {
  if (playerReady) return;

  try {
    TrackPlayer.setupPlayer({
      contentType: 'music',
      handleAudioBecomingNoisy: true,
      progressSync: {
        intervalSeconds: 0.5,
      },
      android: {
        wakeMode: 'local',
        notification: {
          channelId: 'media-playback',
          channelName: 'Reprodução de música',
          smallIcon: 'notification_icon',
        },
      },
    });

    TrackPlayer.setCommands({
      capabilities: [
        PlayerCommand.PlayPause,
        PlayerCommand.Previous,
        PlayerCommand.Next,
        PlayerCommand.Seek,
      ],
    });

    playerReady = true;
  } catch (e) {
    // Já inicializado (setupPlayer lança se chamado duas vezes)
    playerReady = true;
    console.warn('[TrackPlayer] setupPlayer já realizado ou falhou:', e);
  }
}

export const toMediaItem = (track: Track): MediaItem => ({
  mediaId: track.id,
  url: track.file,
  title: track.title,
  artist: track.artist || 'SondLize',
  artworkUrl: track.artwork,
  duration: track.duration / 1000,
});

export const toNativeRepeatMode = (mode: 'off' | 'all' | 'one'): RepeatMode => {
  switch (mode) {
    case 'one':
      return RepeatMode.One;
    case 'all':
      return RepeatMode.All;
    default:
      return RepeatMode.Off;
  }
};
