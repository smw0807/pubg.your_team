import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { cleanupRooms, PRESENCE_TIMEOUT_MS } from '../server/utils/roomCleanup.ts';
import { isCleanupAuthorized } from '../server/utils/cleanupAuth.ts';

let env; let app; let db;
const now = Date.now();
const stale = Timestamp.fromMillis(now - PRESENCE_TIMEOUT_MS - 1);
const fresh = Timestamp.fromMillis(now - 1000);
before(async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
  env = await initializeTestEnvironment({ projectId: 'demo-pubg-cleanup' });
  app = initializeApp({ projectId: 'demo-pubg-cleanup' }, 'cleanup-tests');
  db = getFirestore(app);
});
beforeEach(async () => env.clearFirestore());
after(async () => { await deleteApp(app); await env.cleanup(); });

test('only stale known members expire; fresh and legacy members and profiles are preserved', async () => {
  await db.doc('TEAMS/mixed').set({ members: ['stale', 'fresh', 'legacy'] });
  await db.doc('TEAMS/mixed/PRESENCE/stale').set({ lastSeen: stale });
  await db.doc('TEAMS/mixed/PRESENCE/fresh').set({ lastSeen: fresh });
  await db.doc('PROFILES/stale').set({ email: 'private@example.test' });
  const result = await cleanupRooms(db, { now });
  assert.equal(result.expiredMembers, 1);
  assert.deepEqual((await db.doc('TEAMS/mixed').get()).data().members, ['fresh', 'legacy']);
  assert.equal((await db.doc('TEAMS/mixed/PRESENCE/stale').get()).exists, false);
  assert.deepEqual((await db.doc('PROFILES/stale').get()).data(), { email: 'private@example.test' });
});

test('the last expired member closes the room before deleting messages and presence', async () => {
  await db.doc('TEAMS/stale').set({ members: ['alice'] });
  await db.doc('TEAMS/stale/PRESENCE/alice').set({ lastSeen: stale });
  await db.doc('TEAMS/stale/CHAT_MESSAGES/message').set({ text: 'test' });
  const result = await cleanupRooms(db, { now });
  assert.equal(result.deletedRooms, 1);
  assert.equal((await db.doc('TEAMS/stale').get()).exists, false);
  assert.equal((await db.collection('TEAMS/stale/CHAT_MESSAGES').get()).size, 0);
  assert.equal((await cleanupRooms(db, { now })).deletedRooms, 0);
});

test('closed-room cleanup resumes after reaching the document budget without skipping the parent', async () => {
  await db.doc('TEAMS/closed').set({ members: [], closedBy: 'alice', closedAt: stale });
  for (let i = 0; i < 5; i++) await db.doc(`TEAMS/closed/CHAT_MESSAGES/m${i}`).set({ text: 'test' });
  const first = await cleanupRooms(db, { now, maxDocuments: 2 });
  assert.equal(first.incomplete, true);
  assert.equal(first.deletedDocuments, 2);
  assert.equal((await db.doc('TEAMS/closed').get()).exists, true);
  assert.equal((await db.doc('_SYSTEM/roomCleanup').get()).data().cursor, '');
  const second = await cleanupRooms(db, { now, maxDocuments: 10 });
  assert.equal(second.deletedRooms, 1);
  assert.equal((await db.collection('TEAMS/closed/CHAT_MESSAGES').get()).size, 0);
});

test('pagination eventually visits later rooms without repeatedly scanning the first page', async () => {
  await db.doc('TEAMS/a-live').set({ members: ['legacy'] });
  await db.doc('TEAMS/b-closed').set({ members: [], closedAt: stale, closedBy: 'alice' });
  assert.equal((await cleanupRooms(db, { now, maxRooms: 1 })).deletedRooms, 0);
  assert.equal((await db.doc('_SYSTEM/roomCleanup').get()).data().cursor, 'a-live');
  assert.equal((await cleanupRooms(db, { now, maxRooms: 1 })).deletedRooms, 1);
  await cleanupRooms(db, { now, maxRooms: 1 });
  assert.equal((await db.doc('_SYSTEM/roomCleanup').get()).data().cursor, '');
});

test('an active worker lease prevents overlapping cleanup', async () => {
  await db.doc('_SYSTEM/roomCleanup').set({ owner: 'another-worker', leaseUntil: Timestamp.fromMillis(now + 60_000), cursor: '' });
  await db.doc('TEAMS/closed').set({ members: [], closedAt: stale });
  assert.equal((await cleanupRooms(db, { now })).skipped, true);
  assert.equal((await db.doc('TEAMS/closed').get()).exists, true);
});

test('a heartbeat refreshed before cleanup and malformed timestamps never expire a member', async () => {
  await db.doc('TEAMS/live').set({ members: ['alice', 'bob'] });
  await db.doc('TEAMS/live/PRESENCE/alice').set({ lastSeen: stale });
  await db.doc('TEAMS/live/PRESENCE/alice').update({ lastSeen: fresh });
  await db.doc('TEAMS/live/PRESENCE/bob').set({ lastSeen: 'not a timestamp' });
  assert.equal((await cleanupRooms(db, { now })).expiredMembers, 0);
  assert.deepEqual((await db.doc('TEAMS/live').get()).data().members, ['alice', 'bob']);
});

test('scheduled cleanup authorization fails closed for missing, short and mismatched secrets', () => {
  const secret = 'local-test-only-secret-with-at-least-32-characters';
  assert.equal(isCleanupAuthorized(undefined, undefined), false);
  assert.equal(isCleanupAuthorized('Bearer short', 'short'), false);
  assert.equal(isCleanupAuthorized(`Bearer ${secret}`, undefined), false);
  assert.equal(isCleanupAuthorized('Bearer incorrect', secret), false);
  assert.equal(isCleanupAuthorized(`bearer ${secret}`, secret), false);
  assert.equal(isCleanupAuthorized(`Bearer ${secret}`, secret), true);
});
