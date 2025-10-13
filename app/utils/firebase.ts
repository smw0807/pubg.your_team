import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

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

  const app = initializeApp(firebaseConfig);
  let analytics = null;
  if (import.meta.client) {
    analytics = getAnalytics(app);
  }
  return {
    app,
    analytics,
  };
}
