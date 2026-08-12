import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  query,
  orderBy,
  deleteField,
} from 'firebase/firestore';
import { Folder } from '../core/entities';
import { auth, db } from '../services/firebase';

interface FoldersState {
  folders: Folder[];
  isLoaded: boolean;
  load: () => Promise<void>;
  createFolder: (name: string, color: string) => Promise<void>;
  updateFolder: (
    id: string,
    updates: Partial<Pick<Folder, 'name' | 'color' | 'artwork'>>,
  ) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

const STORAGE_KEY = '@sondlize:folders';

const persist = async (folders: Folder[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
};

export const useFoldersStore = create<FoldersState>((set, get) => ({
  folders: [],
  isLoaded: false,

  load: async () => {
    try {
      // Lê o cache local antes de qualquer sync, para nunca perdê-lo
      // para um resultado vindo da nuvem vazio.
      let local: Folder[] = [];
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        local = raw ? JSON.parse(raw) : [];
      } catch {
        local = [];
      }

      const user = auth.currentUser;

      if (user) {
        const q = query(
          collection(db, 'users', user.uid, 'folders'),
          orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(q);
        const remote: Folder[] = [];
        snapshot.forEach((doc) => {
          remote.push(doc.data() as Folder);
        });

        // FIX: bug de perda de dados — se o Firebase voltar vazio mas o aparelho
        // tiver pastas locais, NÃO sobrescreve o cache local com a lista vazia.
        if (remote.length === 0 && local.length > 0) {
          console.warn('[useFoldersStore] Firebase vazio; mantendo pastas locais.');
          set({ folders: local, isLoaded: true });
          return;
        }

        set({ folders: remote, isLoaded: true });
        await persist(remote);
      } else {
        set({ folders: local, isLoaded: true });
      }
    } catch {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const folders: Folder[] = raw ? JSON.parse(raw) : [];
        set({ folders, isLoaded: true });
      } catch {
        set({ isLoaded: true });
      }
    }
  },

  createFolder: async (name, color) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      color,
      createdAt: Date.now(),
    };
    const folders = [...get().folders, newFolder];
    set({ folders });
    await persist(folders);

    const user = auth.currentUser;
    if (user) {
      try {
        const folderRef = doc(db, 'users', user.uid, 'folders', newFolder.id);
        await setDoc(folderRef, newFolder);
      } catch (e) {
        console.warn('Firestore save failed:', e);
      }
    }
  },

  updateFolder: async (id, updates) => {
    const folders = get().folders.map((f) =>
      f.id === id ? { ...f, ...updates } : f,
    );
    set({ folders });
    await persist(folders);

    const user = auth.currentUser;
    if (user) {
      try {
        const folderRef = doc(db, 'users', user.uid, 'folders', id);
        const payload: Record<string, unknown> = { ...updates };
        if (updates.artwork === undefined) {
          payload.artwork = deleteField();
        }
        await setDoc(folderRef, payload, { merge: true });
      } catch (e) {
        console.warn('Firestore update failed:', e);
      }
    }
  },

  deleteFolder: async (id) => {
    const folders = get().folders.filter((f) => f.id !== id);
    set({ folders });
    await persist(folders);

    const user = auth.currentUser;
    if (user) {
      try {
        const folderRef = doc(db, 'users', user.uid, 'folders', id);
        await deleteDoc(folderRef);
      } catch (e) {
        console.warn('Firestore delete failed:', e);
      }
    }
  },
}));
