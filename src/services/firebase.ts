import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
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
