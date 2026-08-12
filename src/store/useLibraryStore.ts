import { create } from 'zustand';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  documentDirectory,
  makeDirectoryAsync,
  copyAsync,
  deleteAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';
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
  rescanMusic: () => Promise<number>;
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
      // Lê o cache local antes de qualquer sync, para nunca perdê-lo
      // para um resultado vindo da nuvem vazio.
      let local: Track[] = [];
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        local = raw ? JSON.parse(raw) : [];
      } catch {
        local = [];
      }

      const user = auth.currentUser;

      if (user) {
        const q = query(
          collection(db, 'users', user.uid, 'tracks'),
          orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(q);
        const remote: Track[] = [];
        snapshot.forEach((doc) => {
          remote.push(doc.data() as Track);
        });

        // FIX: bug de perda de dados — se o Firebase voltar vazio mas o aparelho
        // tiver músicas locais (ex.: upload em background falhou), NÃO sobrescreve
        // a biblioteca local com a lista vazia.
        if (remote.length === 0 && local.length > 0) {
          console.warn('[loadTracks] Firebase vazio; mantendo biblioteca local.');
          set({ tracks: local, isLoaded: true });
          return;
        }

        set({ tracks: remote, isLoaded: true });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      } else {
        set({ tracks: local, isLoaded: true });
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
        // We copy it to a permanent directory
        const permDir = `${documentDirectory}SondLizeMusic/`;
        await makeDirectoryAsync(permDir, { intermediates: true });
        
        // Generate a safe file name
        const safeNameForLocal = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : `track_${Date.now()}.mp3`;
        const destPath = `${permDir}${safeNameForLocal}`;
        await copyAsync({ from: file.uri, to: destPath });
        
        const fileUri = destPath;

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
            const track = newTracks[i];
            try {
              console.log(`[Background Upload] Enviando para o Firebase: "${track.title}" (${track.file})`);
              const response = await fetch(track.file);
              const blob = await response.blob();
              // Usa o mesmo nome do arquivo local para que o deleteTrack()
              // consiga apagar o arquivo do Storage com track.file.split('/').pop().
              const safeName = track.file.split('/').pop() || '';
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
      // Delete local file from permanent storage
      if (track.file && documentDirectory && track.file.startsWith(documentDirectory)) {
        try {
          await deleteAsync(track.file, { idempotent: true });
        } catch (e) {
          console.warn('Local file delete failed:', e);
        }
      }

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
  },

  rescanMusic: async () => {
    set({ isLoading: true, error: null });

    try {
      const permDir = `${documentDirectory}SondLizeMusic/`;
      let files: string[] = [];
      try {
        files = await readDirectoryAsync(permDir);
      } catch {
        // Pasta não existe ainda — nada a recuperar.
        files = [];
      }

      const AUDIO_EXTS = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'opus', 'mp4'];
      const existingPaths = new Set(get().tracks.map((t) => t.file));
      const recovered: Track[] = [];

      for (const name of files) {
        const ext = name.split('.').pop()?.toLowerCase() ?? '';
        if (!AUDIO_EXTS.includes(ext)) continue;

        const fileUri = `${permDir}${name}`;
        if (existingPaths.has(fileUri)) continue; // já está na biblioteca

        const metadata = await extractMetadata(fileUri);
        const duration = await getTrackDuration(fileUri);

        const title = metadata.title || name.replace(/\.[^/.]+$/, '');
        const artist = metadata.artist || 'Offline';

        recovered.push({
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          title,
          artist,
          duration,
          file: fileUri,
          folderId: undefined,
          artwork: metadata.artwork,
          createdAt: Date.now(),
        });
      }

      set({ isLoading: false });

      if (recovered.length === 0) return 0;

      const updatedTracks = [...get().tracks, ...recovered];
      set({ tracks: updatedTracks });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTracks));

      // Sobe as músicas recuperadas para o Firebase em segundo plano,
      // igual ao fluxo de importação.
      const user = auth.currentUser;
      if (user) {
        (async () => {
          for (const track of recovered) {
            try {
              const response = await fetch(track.file);
              const blob = await response.blob();
              const safeName = track.file.split('/').pop() || '';
              const storageRef = ref(storage, `users/${user.uid}/tracks/${safeName}`);
              await uploadBytes(storageRef, blob);

              const trackRef = doc(db, 'users', user.uid, 'tracks', track.id);
              await setDoc(trackRef, track);
            } catch (e) {
              console.warn(`[Rescan] Falha no upload de "${track.title}":`, e);
            }
          }
        })();
      }

      return recovered.length;
    } catch (e: any) {
      console.error('Rescan error:', e);
      set({ error: e?.message ?? 'Erro ao recuperar músicas.', isLoading: false });
      return 0;
    }
  },
}));
