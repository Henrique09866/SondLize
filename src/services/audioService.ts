import { Audio, AVPlaybackStatus } from 'expo-av';

class AudioService {
  private sound: Audio.Sound | null = null;
  private onStatusUpdateCallback: ((status: AVPlaybackStatus) => void) | null = null;
  private isInitializing: boolean = false;

  async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('[AudioService] Failed to set audio mode:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  async load(uri: string, onStatusUpdate: (status: AVPlaybackStatus) => void) {
    try {
      await this.init();
      this.onStatusUpdateCallback = onStatusUpdate;

      if (this.sound) {
        try {
          await this.sound.unloadAsync();
        } catch (e) {
          // Ignore unload errors of previous sounds
        }
        this.sound = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        this.handlePlaybackStatusUpdate,
        true // Enable progress updates
      );
      this.sound = sound;

      // Set progress update interval to 500ms
      await this.sound.setProgressUpdateIntervalAsync(500);
    } catch (error) {
      console.error('[AudioService] Failed to load track:', error);
      throw error;
    }
  }

  private handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (this.onStatusUpdateCallback) {
      this.onStatusUpdateCallback(status);
    }
  };

  async play() {
    if (this.sound) {
      await this.sound.playAsync();
    }
  }

  async pause() {
    if (this.sound) {
      await this.sound.pauseAsync();
    }
  }

  async seek(seconds: number) {
    if (this.sound) {
      await this.sound.setPositionAsync(seconds * 1000);
    }
  }

  async setVolume(volume: number) {
    if (this.sound) {
      await this.sound.setVolumeAsync(volume);
    }
  }

  async unload() {
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (e) {
        // Ignore
      }
      this.sound = null;
    }
  }
}

export const audioService = new AudioService();
