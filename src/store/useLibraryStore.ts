import { create } from 'zustand';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import {
  doc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { Track } from '../core/entities';
import { extractMetadata } from '../utils/metadataParser';
import { auth, db, storage } from '../services/firebase';

interface LibraryState {
  tracks: Track[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  loadTracks: () => Promise<void>;
  importMusic: () => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  updateTrackFolder: (trackId: string, folderId: string | undefined) => Promise<void>;
}

const STORAGE_KEY = '@sondlize:library';

const getTrackDuration = async (uri: string): Promise<number> => {
  try {
    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );
    const duration = status.isLoaded && status.durationMillis ? status.durationMillis : 0;
    await sound.unloadAsync();
    return duration;
  } catch {
    return 0;
  }
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  loadTracks: async () => {
    try {
      const user = auth.currentUser;

      if (user) {
        const q = query(
          collection(db, 'users', user.uid, 'tracks'),
          orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(q);
        const tracks: Track[] = [];
        snapshot.forEach((doc) => {
          tracks.push(doc.data() as Track);
        });
        set({ tracks, isLoaded: true });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
      } else {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const tracks: Track[] = raw ? JSON.parse(raw) : [];
        set({ tracks, isLoaded: true });
      }
    } catch {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const tracks: Track[] = raw ? JSON.parse(raw) : [];
        set({ tracks, isLoaded: true });
      } catch {
        set({ isLoaded: true });
      }
    }
  },

  importMusic: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/mp3', 'audio/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets) {
        set({ isLoading: false });
        return;
      }

      const newTracks: Track[] = [];
      const user = auth.currentUser;

      for (const file of result.assets) {
        // The file is already copied to cache by DocumentPicker (copyToCacheDirectory: true)
        // We use the cache URI directly
        const fileUri = file.uri;

        const metadata = await extractMetadata(fileUri);
        const duration = await getTrackDuration(fileUri);

        const title = metadata.title || (file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Desconhecido');
        const artist = metadata.artist || 'Offline';

        const track: Track = {
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          title,
          artist,
          duration,
          file: fileUri,
          folderId: undefined,
          artwork: metadata.artwork,
          createdAt: Date.now(),
        };

        newTracks.push(track);
      }

      const updatedTracks = [...get().tracks, ...newTracks];
      set({ tracks: updatedTracks, isLoading: false });

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTracks));

      // Se houver um usuário autenticado, faz o upload em segundo plano para o Firebase
      if (user) {
        // Dispara a promessa sem dar o 'await' para não travar a UI
        (async () => {
          console.log('[Background Upload] Iniciando upload em segundo plano de', newTracks.length, 'músicas');
          for (let i = 0; i < result.assets.length; i++) {
            const file = result.assets[i];
            const track = newTracks[i];
            try {
              console.log(`[Background Upload] Enviando para o Firebase: "${track.title}" (${track.file})`);
              const response = await fetch(track.file);
              const blob = await response.blob();
              const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
              const storageRef = ref(storage, `users/${user.uid}/tracks/${safeName}`);
              await uploadBytes(storageRef, blob);

              const trackRef = doc(db, 'users', user.uid, 'tracks', track.id);
              await setDoc(trackRef, track);
              console.log(`[Background Upload] Sucesso ao enviar "${track.title}" para o Firebase`);
            } catch (e) {
              console.warn(`[Background Upload] Falha no upload de "${track.title}":`, e);
            }
          }
        })();
      }

    } catch (e: any) {
      console.error('Import error:', e);
      set({ error: e?.message ?? 'Erro ao importar músicas.', isLoading: false });
    }
  },

  deleteTrack: async (id: string) => {
    const track = get().tracks.find((t) => t.id === id);
    if (!track) return;

    try {
      const user = auth.currentUser;
      if (user) {
        try {
          const safeName = track.file.split('/').pop() || '';
          const storageRef = ref(storage, `users/${user.uid}/tracks/${safeName}`);
          await deleteObject(storageRef);

          const trackRef = doc(db, 'users', user.uid, 'tracks', track.id);
          await deleteDoc(trackRef);
        } catch (e) {
          console.warn('Firebase delete failed:', e);
        }
      }

      const updatedTracks = get().tracks.filter((t) => t.id !== id);
      set({ tracks: updatedTracks });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTracks));
    } catch (e) {
      console.warn('Failed to delete track:', e);
    }
  },

  updateTrackFolder: async (trackId: string, folderId: string | undefined) => {
    const updatedTracks = get().tracks.map(t =>
      t.id === trackId ? { ...t, folderId } : t
    );
    set({ tracks: updatedTracks });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTracks));

    const user = auth.currentUser;
    if (user) {
      try {
        const trackRef = doc(db, 'users', user.uid, 'tracks', trackId);
        await setDoc(trackRef, { folderId }, { merge: true });
      } catch (e) {
        console.warn('Firestore update failed:', e);
      }
    }
  }
}));
