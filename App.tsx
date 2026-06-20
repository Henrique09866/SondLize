import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { usePlayerStore } from './src/store/usePlayerStore';
import { useLibraryStore } from './src/store/useLibraryStore';
import { setupNotifications } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    let appStateSubscription: any;
    let isInitialized = false;

    async function initTrackPlayer() {
      if (isInitialized) return;
      try {
        usePlayerStore.getState().initListeners();
        isInitialized = true;
      } catch (e: any) {
        console.error('Erro ao configurar AudioService:', e);
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
      }
    }

    setupApp();

    return () => {
      appStateSubscription?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
