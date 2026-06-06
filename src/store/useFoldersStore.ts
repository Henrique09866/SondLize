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
} from 'firebase/firestore';
import { Folder } from '../core/entities';
import { auth, db } from '../services/firebase';

interface FoldersState {
  folders: Folder[];
  isLoaded: boolean;
  load: () => Promise<void>;
  createFolder: (name: string, color: string) => Promise<void>;
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
      const user = auth.currentUser;

      if (user) {
        const q = query(
          collection(db, 'users', user.uid, 'folders'),
          orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(q);
        const folders: Folder[] = [];
        snapshot.forEach((doc) => {
          folders.push(doc.data() as Folder);
        });
        set({ folders, isLoaded: true });
        await persist(folders);
      } else {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const folders: Folder[] = raw ? JSON.parse(raw) : [];
        set({ folders, isLoaded: true });
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
