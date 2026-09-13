import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function cleanupFirestore() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  if (!projectId) throw new Error('Cleanup project is not configured');
  if (process.env.FIRESTORE_EMULATOR_HOST && !projectId.startsWith('demo-')) throw new Error('Unexpected cleanup emulator configuration');
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (Boolean(clientEmail) !== Boolean(privateKey)) throw new Error('Incomplete cleanup credentials');
  const name = 'room-cleanup';
  const app = getApps().find((item) => item.name === name) ?? initializeApp({
    projectId,
    credential: clientEmail && privateKey ? cert({ projectId, clientEmail, privateKey }) : applicationDefault(),
  }, name);
  if (app.options.projectId !== projectId) throw new Error('Cleanup project mismatch');
  return getFirestore(app);
}
