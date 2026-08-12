import { create } from 'zustand';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  auth,
  db,
  storage,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from '../services/firebase';
import { AvatarCrop } from '../core/entities';

export interface UserProfile {
  displayName?: string;
  photoURL?: string;
  crop?: AvatarCrop;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  listen: () => () => void;
  loadProfile: () => Promise<void>;
  saveProfile: (data: Partial<UserProfile>) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<void>;
}

const getProfileRef = (uid: string) => doc(db, 'users', uid);

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  initialized: false,

  listen: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, isLoading: false, initialized: true });
      if (user) {
        useAuthStore.getState().loadProfile();
      } else {
        set({ profile: null });
      }
    });
    return unsubscribe;
  },

  signIn: async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  },

  signUp: async (email, password) => {
    await createUserWithEmailAndPassword(auth, email, password);
  },

  signOut: async () => {
    await firebaseSignOut(auth);
  },

  loadProfile: async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const snapshot = await getDoc(getProfileRef(user.uid));
      const profile = snapshot.exists()
        ? (snapshot.data() as UserProfile)
        : null;
      set({ profile: profile ?? null });
    } catch (e) {
      console.warn('[useAuthStore] Falha ao carregar perfil:', e);
      set({ profile: null });
    }
  },

  saveProfile: async (data) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado.');

    await setDoc(getProfileRef(user.uid), data, { merge: true });
    set({ profile: { ...(useAuthStore.getState().profile ?? {}), ...data } });
  },

  uploadAvatar: async (uri) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado.');

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const extMatch = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const safeExt = /^(jpg|jpeg|png|webp|heic|heif)$/.test(ext) ? ext : 'jpg';
    const contentType = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
    }[safeExt];

    const storageRef = ref(storage, `users/${user.uid}/avatar.${safeExt}`);
    await uploadString(storageRef, base64, 'base64', { contentType });
    const photoURL = await getDownloadURL(storageRef);

    await setDoc(getProfileRef(user.uid), { photoURL }, { merge: true });
    set({ profile: { ...(useAuthStore.getState().profile ?? {}), photoURL } });
  },
}));
