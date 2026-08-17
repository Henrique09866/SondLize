import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import {
  auth,
  db,
  FIREBASE_STORAGE_BUCKET,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from '../services/firebase';
import { AvatarCrop } from '../core/entities';
import { usePlayerStore } from './usePlayerStore';

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
const getProfileCacheKey = (uid: string) => `@sondlize:profile:${uid}`;

const createToken = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;

const inferImageType = (uri: string) => {
  const extMatch = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const safeExt = /^(jpg|jpeg|png|webp|heic|heif)$/.test(ext) ? ext : 'jpg';
  let contentType = 'image/jpeg';
  if (safeExt === 'png') contentType = 'image/png';
  if (safeExt === 'webp') contentType = 'image/webp';
  if (safeExt === 'heic') contentType = 'image/heic';
  if (safeExt === 'heif') contentType = 'image/heif';

  return { safeExt, contentType };
};

const uploadFileToFirebaseStorage = async (
  uri: string,
  objectName: string,
  contentType: string,
  token: string,
) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  const idToken = await user.getIdToken();
  const uploadUrl =
    `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o` +
    `?uploadType=media&name=${encodeURIComponent(objectName)}`;

  const result = await FileSystem.uploadAsync(uploadUrl, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': contentType,
      'x-goog-meta-firebaseStorageDownloadTokens': token,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Falha ao enviar foto. Código ${result.status}.`);
  }
};

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
        usePlayerStore.getState().loadPreferences();
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

    const cacheKey = getProfileCacheKey(user.uid);
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) set({ profile: JSON.parse(raw) as UserProfile });
    } catch {
      // Cache é apenas fallback; se falhar, seguimos para o Firestore.
    }

    try {
      const snapshot = await getDoc(getProfileRef(user.uid));
      const profile = snapshot.exists()
        ? (snapshot.data() as UserProfile)
        : null;
      if (profile) {
        set({ profile });
        await AsyncStorage.setItem(cacheKey, JSON.stringify(profile));
      }
    } catch (e) {
      console.warn('[useAuthStore] Falha ao carregar perfil:', e);
    }
  },

  saveProfile: async (data) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado.');

    const nextProfile = { ...(useAuthStore.getState().profile ?? {}), ...data };
    set({ profile: nextProfile });
    await AsyncStorage.setItem(getProfileCacheKey(user.uid), JSON.stringify(nextProfile));
    if (data.displayName !== undefined) {
      await updateProfile(user, { displayName: data.displayName });
    }
    await setDoc(getProfileRef(user.uid), data, { merge: true });
  },

  uploadAvatar: async (uri) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado.');

    const { safeExt, contentType } = inferImageType(uri);
    const token = createToken();
    const objectName = `users/${user.uid}/avatar.${safeExt}`;

    await uploadFileToFirebaseStorage(uri, objectName, contentType, token);

    const photoURL =
      `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/` +
      `${encodeURIComponent(objectName)}?alt=media&token=${token}`;
    const nextProfile = { ...(useAuthStore.getState().profile ?? {}), photoURL };

    set({ profile: nextProfile });
    await AsyncStorage.setItem(getProfileCacheKey(user.uid), JSON.stringify(nextProfile));
    await updateProfile(user, { photoURL });
    await setDoc(getProfileRef(user.uid), { photoURL }, { merge: true });
  },
}));
