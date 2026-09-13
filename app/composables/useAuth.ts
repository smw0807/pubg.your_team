import { computed, ref, shallowRef } from 'vue';
import {
  getAdditionalUserInfo, getAuth, GoogleAuthProvider, onAuthStateChanged,
  signInWithPopup, signOut, type Auth, type User, type UserCredential,
} from 'firebase/auth';
import useFirebase from '~/utils/firebase';
import { signOutAfterCleanup, waitForInitialAuth } from '~/services/authReady';

function createSession(auth: Auth) {
  const user = shallowRef<User | null>(null);
  const ready = ref(false);
  onAuthStateChanged(auth, (current) => {
    user.value = current;
    ready.value = true;
  });
  const wait = async () => {
    user.value = await waitForInitialAuth(auth);
    ready.value = true;
    return user.value;
  };
  return { user, ready, wait, beforeSignOut: new Set<() => Promise<void>>() };
}

// Browser Auth instances only: no user state shared between SSR requests.
const sessions = new WeakMap<Auth, ReturnType<typeof createSession>>();

export default function useAuth() {
  const { app } = useFirebase();
  const auth = import.meta.client ? getAuth(app) : null;
  let session = auth ? sessions.get(auth) : undefined;
  if (auth && !session) {
    session = createSession(auth);
    sessions.set(auth, session);
  }
  const current = session;
  return {
    user: computed(() => current?.user.value ?? null),
    isAuthReady: computed(() => current?.ready.value ?? false),
    waitForAuth: () => current?.wait() ?? Promise.resolve(null),
    signIn: async () => { if (auth) await signInWithPopup(auth, new GoogleAuthProvider()); },
    signOut: () => signOutAfterCleanup(current?.beforeSignOut ?? [], async () => { if (auth) await signOut(auth); }),
    onBeforeSignOut: (callback: () => Promise<void>) => {
      current?.beforeSignOut.add(callback);
      return () => { current?.beforeSignOut.delete(callback); };
    },
    isNewUser: async (user: UserCredential) => getAdditionalUserInfo(user)?.isNewUser ?? false,
  };
}
