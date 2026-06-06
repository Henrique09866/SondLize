import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TrackPlayer, { Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';
import { AppNavigator } from './src/navigation/AppNavigator';
import { usePlayerStore } from './src/store/usePlayerStore';
import { useLibraryStore } from './src/store/useLibraryStore';
import { setupNotifications } from './src/services/notificationService';

export default function App() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    let appStateSubscription: any;
    let isInitialized = false;

    async function initTrackPlayer() {
      if (isInitialized) return;
      
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
        });
        usePlayerStore.getState().initListeners();
        isInitialized = true;
        setIsPlayerReady(true);
      } catch (e: any) {
        if (e?.message?.includes('already initialized')) {
          isInitialized = true;
          setIsPlayerReady(true);
        } else {
          console.error('Erro ao configurar TrackPlayer:', e);
        }
      }
    }

    async function setupApp() {
      try {
        await setupNotifications();
        useLibraryStore.getState().loadTracks();
        
        // Android requires foreground to setup TrackPlayer
        if (AppState.currentState === 'active') {
          await initTrackPlayer();
        } else {
          appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
              await initTrackPlayer();
              appStateSubscription?.remove();
            }
          });
        }
      } catch (e) {
        console.error('Erro ao iniciar App:', e);
        setIsPlayerReady(true);
      }
    }

    setupApp();

    return () => {
      appStateSubscription?.remove();
    };
  }, []);

  if (!isPlayerReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
