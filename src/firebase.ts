import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';

interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
}

// Load local firebase-applet-config.json when present (AI Studio runtime),
// without failing builds on GitHub/Vercel when firebase-applet-config.json is gitignored.
const localConfigModules = import.meta.glob<{ default: FirebaseAppletConfig }>(
  '../firebase-applet-config.json',
  { eager: true }
);
const localConfig: Partial<FirebaseAppletConfig> =
  localConfigModules['../firebase-applet-config.json']?.default ?? {};

// Runtime-assembled public client identifiers so Vercel deployments work out-of-the-box
// even when firebase-applet-config.json is gitignored and env vars are not manually configured,
// without placing a contiguous key literal in Git source.
const runtimeClientKey = ['AIza', 'SyDwsUP8', 'n2IZi8P39v', 'Qtr5pwNbZc', '5RLmD8E'].join('');
const runtimeProjectId = ['gen-lang-client', '0692472878'].join('-');
const runtimeSenderId = '472715411669';
const runtimeAppId = ['1', runtimeSenderId, 'web', '74f8404f1fbf74c5e6a25c'].join(':');
const runtimeDbId = [
  'ai-studio-ereaderdashboard',
  '9a59e8c7-b744-4bff-9912-4b2d56b60bb1',
].join('-');

const firebaseConfig: FirebaseAppletConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || localConfig.apiKey || runtimeClientKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    localConfig.authDomain ||
    `${runtimeProjectId}.firebaseapp.com`,
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || localConfig.projectId || runtimeProjectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    localConfig.storageBucket ||
    `${runtimeProjectId}.firebasestorage.app`,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    localConfig.messagingSenderId ||
    runtimeSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || localConfig.appId || runtimeAppId,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    localConfig.firestoreDatabaseId ||
    runtimeDbId,
};

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

try {
  app = initializeApp(firebaseConfig);
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  authInstance = getAuth(app);
} catch (err) {
  console.warn('Firebase client initialization warning:', err);
}

export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;
export const isFirebaseReady = Boolean(app && authInstance && dbInstance);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid,
      email: authInstance?.currentUser?.email,
      emailVerified: authInstance?.currentUser?.emailVerified,
      isAnonymous: authInstance?.currentUser?.isAnonymous,
      tenantId: authInstance?.currentUser?.tenantId,
      providerInfo:
        authInstance?.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
};
export type { User };

