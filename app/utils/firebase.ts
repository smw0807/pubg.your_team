import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

let firebaseApp: FirebaseApp | null = null;
let firebaseAnalytics: ReturnType<typeof getAnalytics> | null = null;

export default function useFirebase() {
  const config = useRuntimeConfig();

  const firebaseConfig: FirebaseOptions = {
    apiKey: config.public.apiKey as string,
    authDomain: config.public.authDomain as string,
    projectId: config.public.projectId as string,
    storageBucket: config.public.storageBucket as string,
    messagingSenderId: config.public.messagingSenderId as string,
    appId: config.public.appId as string,
    measurementId: config.public.measurementId as string,
  };

  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  if (import.meta.client && !firebaseAnalytics) {
    firebaseAnalytics = getAnalytics(firebaseApp);
  }

  return {
    app: firebaseApp,
    analytics: firebaseAnalytics,
  };
}
