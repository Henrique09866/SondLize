import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  Persistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCun7YNOxIHdXJVyzcE6Y-NJ3TsExynTAw',
  authDomain: 'sondlize-309b4.firebaseapp.com',
  projectId: 'sondlize-309b4',
  storageBucket: 'sondlize-309b4.firebasestorage.app',
  messagingSenderId: '36923020233',
  appId: '1:36923020233:web:acfd72571e6d84c0ef0e18',
  measurementId: 'G-DMD6JQYET4',
};

// Persistência local para React Native baseada no AsyncStorage.
// O build RN do Firebase Auth espera uma classe com os métodos "_*" abaixo.
const RN_STORAGE_AVAILABLE_KEY = '__sak';

class AsyncStoragePersistence implements Persistence {
  static type = 'LOCAL' as const;
  readonly type = 'LOCAL' as const;

  async _isAvailable(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(RN_STORAGE_AVAILABLE_KEY, '1');
      await AsyncStorage.removeItem(RN_STORAGE_AVAILABLE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  _set(key: string, value: any): Promise<void> {
    return AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async _get<T>(key: string): Promise<T | null> {
    const json = await AsyncStorage.getItem(key);
    return json ? (JSON.parse(json) as T) : null;
  }

  _remove(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  }

  _addListener(_key: string, _listener: (value: unknown) => void): void {}

  _removeListener(_key: string, _listener: (value: unknown) => void): void {}
}

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: AsyncStoragePersistence,
});
const db = getFirestore(app);
const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut as signOut,
};

export type { User };
