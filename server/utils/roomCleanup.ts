import { randomUUID } from 'node:crypto';
import { FieldPath, Timestamp, type Firestore, type DocumentReference } from 'firebase-admin/firestore';

export const PRESENCE_TIMEOUT_MS = 10 * 60_000;

// Bounded and resumable: never delete profiles, unknown collections or members
// without a lease (older app versions do not report presence).
export async function cleanupRooms(db: Firestore, options: {
  now?: number; maxRooms?: number; maxDocuments?: number; budgetMs?: number;
} = {}) {
  const now = options.now ?? Date.now();
  const maxRooms = options.maxRooms ?? 100;
  const maxDocuments = options.maxDocuments ?? 1000;
  const deadline = Date.now() + (options.budgetMs ?? 20_000);
  if (maxRooms < 1 || maxRooms > 100 || maxDocuments < 1 || maxDocuments > 1000) throw new Error('Invalid cleanup limits');
  const state = db.doc('_SYSTEM/roomCleanup');
  const owner = randomUUID();
  const result = { skipped: false, scanned: 0, expiredMembers: 0, deletedRooms: 0, deletedDocuments: 0, incomplete: false };
  const lease = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(state);
    const data = snapshot.data();
    if (data?.leaseUntil?.toMillis() > now) return null;
    transaction.set(state, { owner, leaseUntil: Timestamp.fromMillis(now + 120_000) }, { merge: true });
    return { cursor: typeof data?.cursor === 'string' ? data.cursor : '' };
  });
  if (!lease) return { ...result, skipped: true };
  let cursor = lease.cursor;

  const expireMembers = (ref: DocumentReference) => db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return { closed: false, expired: 0 };
    const data = snapshot.data()!;
    if (!Array.isArray(data.members) || data.members.length > 4 || !data.members.every((uid: unknown) => typeof uid === 'string')) return { closed: false, expired: 0 };
    if (data.closedAt) return { closed: data.members.length === 0, expired: 0 };
    if (!data.members.length) return { closed: false, expired: 0 };
    const presence = await transaction.getAll(...data.members.map((uid: string) => ref.collection('PRESENCE').doc(uid)));
    const expired = presence.filter((entry) => {
      const lastSeen = entry.data()?.lastSeen;
      return lastSeen instanceof Timestamp && lastSeen.toMillis() <= now - PRESENCE_TIMEOUT_MS;
    });
    if (!expired.length) return { closed: false, expired: 0 };
    const stale = new Set(expired.map((entry) => entry.id));
    const members = data.members.filter((uid: string) => !stale.has(uid));
    transaction.update(ref, members.length ? { members } : { members, closedAt: Timestamp.fromMillis(now), closedBy: 'server-cleanup' });
    expired.forEach((entry) => transaction.delete(entry.ref));
    return { closed: members.length === 0, expired: expired.length };
  });

  const removeClosedRoom = async (ref: DocumentReference) => {
    for (const name of ['CHAT_MESSAGES', 'PRESENCE']) {
      while (true) {
        if (Date.now() >= deadline || result.deletedDocuments >= maxDocuments) return false;
        const children = await ref.collection(name).limit(Math.min(400, maxDocuments - result.deletedDocuments)).get();
        if (children.empty) break;
        const batch = db.batch();
        children.docs.forEach((entry) => batch.delete(entry.ref));
        await batch.commit();
        result.deletedDocuments += children.size;
      }
    }
    const deleted = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return false;
      if (!snapshot.data()?.closedAt || snapshot.data()?.members?.length !== 0) return false;
      transaction.delete(ref);
      return true;
    });
    if (deleted) result.deletedRooms++;
    return true;
  };

  try {
    let query = db.collection('TEAMS').orderBy(FieldPath.documentId()).limit(maxRooms);
    if (cursor) query = query.startAfter(cursor);
    const rooms = await query.get();
    let completedPage = true;
    for (const room of rooms.docs) {
      if (Date.now() >= deadline) { completedPage = false; break; }
      const status = await expireMembers(room.ref);
      result.scanned++;
      result.expiredMembers += status.expired;
      if (status.closed && !await removeClosedRoom(room.ref)) { completedPage = false; break; }
      cursor = room.id;
    }
    if (completedPage && rooms.size < maxRooms) cursor = '';
    result.incomplete = !completedPage || rooms.size === maxRooms;
    return result;
  } finally {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(state);
      if (snapshot.data()?.owner !== owner) return;
      transaction.set(state, { cursor, owner: '', leaseUntil: Timestamp.fromMillis(0) });
    });
  }
}
