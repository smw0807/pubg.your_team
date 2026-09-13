// Kept separate from the Nuxt composable so the initial-auth race is testable.
export async function waitForInitialAuth<T>(auth: { authStateReady: () => Promise<void>; readonly currentUser: T }) {
  await auth.authStateReady();
  return auth.currentUser;
}

export async function signOutAfterCleanup(handlers: Iterable<() => Promise<void>>, signOut: () => Promise<void>) {
  let roomCleanupFailed = false;
  for (const leave of handlers) {
    try { await leave(); }
    catch { roomCleanupFailed = true; }
  }
  // Local sign-out must remain possible even when Firestore is unavailable.
  await signOut();
  return { roomCleanupFailed };
}
