import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, setLogLevel, updateDoc, writeBatch } from 'firebase/firestore';
import { joinRoom, leaveRoom, touchRoomPresence, RoomError, roomErrorMessage } from '../app/services/room.ts';
import { signOutAfterCleanup, waitForInitialAuth } from '../app/services/authReady.ts';

let env;
const profile = (uid) => ({ id: uid, steamNickname: `${uid}_steam`, kakaoNickname: `${uid}_kakao` });
const room = { title: 'Lifecycle test', description: '', platform: 'steam', mode: 'duo', tier: null, damage: null, isRanked: true, members: ['alice'], createdAt: new Date() };
const dbFor = (uid) => uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
before(async () => {
  setLogLevel('silent');
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
  env = await initializeTestEnvironment({ projectId: 'demo-pubg-lifecycle', firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    for (const uid of ['alice', 'bob', 'carol']) await setDoc(doc(context.firestore(), 'PUBLIC_PROFILES', uid), profile(uid));
    await setDoc(doc(context.firestore(), 'TEAMS', 'room'), room);
  });
});

test('direct entry waits for restored authentication rather than treating initial null as signed out', async () => {
  let resolve;
  const ready = new Promise((done) => { resolve = done; });
  const auth = { currentUser: null, authStateReady: () => ready };
  let completed = false;
  const result = waitForInitialAuth(auth).then((user) => { completed = true; return user; });
  await Promise.resolve();
  assert.equal(completed, false);
  auth.currentUser = { uid: 'alice' };
  resolve();
  assert.equal((await result).uid, 'alice');
  assert.equal(await waitForInitialAuth({ currentUser: null, authStateReady: async () => {} }), null);
});

test('sign-out waits for room cleanup, but cleanup failures cannot prevent local sign-out', async () => {
  const order = [];
  assert.deepEqual(await signOutAfterCleanup([async () => { order.push('leave'); }], async () => { order.push('sign-out'); }), { roomCleanupFailed: false });
  assert.deepEqual(order, ['leave', 'sign-out']);
  let signedOut = false;
  const result = await signOutAfterCleanup([async () => { throw new Error('offline'); }], async () => { signedOut = true; });
  assert.equal(signedOut, true);
  assert.equal(result.roomCleanupFailed, true);
  await assert.rejects(signOutAfterCleanup([], async () => { throw new Error('sign-out failed'); }), /sign-out failed/);
});

test('two accounts can join, chat, leave one seat, then remove the last room and its children', async () => {
  const alice = dbFor('alice'); const bob = dbFor('bob');
  await joinRoom(alice, 'room', 'alice', profile('alice'));
  await joinRoom(bob, 'room', 'bob', profile('bob'));
  await setDoc(doc(alice, 'TEAMS', 'room', 'CHAT_MESSAGES', 'hello'), {
    type: 'user', uid: 'alice', senderId: 'alice', sender: 'alice_steam', message: 'hello', createdAt: serverTimestamp(),
  });
  assert.equal((await getDocs(collection(bob, 'TEAMS', 'room', 'CHAT_MESSAGES'))).size, 1);
  await leaveRoom(alice, 'room', 'alice');
  assert.deepEqual((await getDoc(doc(bob, 'TEAMS', 'room'))).data().members, ['bob']);
  await assertFails(getDocs(collection(alice, 'TEAMS', 'room', 'CHAT_MESSAGES')));
  await leaveRoom(bob, 'room', 'bob');
  // The destination list is read only after leaveRoom resolves.
  assert.equal((await getDocs(collection(dbFor(), 'TEAMS'))).size, 0);
  await env.withSecurityRulesDisabled(async (context) => {
    for (const name of ['CHAT_MESSAGES', 'PRESENCE']) assert.equal((await getDocs(collection(context.firestore(), 'TEAMS', 'room', name))).size, 0);
  });
  await leaveRoom(bob, 'room', 'bob');
});

test('concurrent joins cannot overbook and rejoining after refresh cannot duplicate a member', async () => {
  const results = await Promise.allSettled(['bob', 'carol'].map((uid) => joinRoom(dbFor(uid), 'room', uid, profile(uid))));
  assert.equal(results.filter((value) => value.status === 'fulfilled').length, 1);
  const members = (await getDoc(doc(dbFor(), 'TEAMS', 'room'))).data().members;
  const uid = members.find((member) => member !== 'alice');
  await joinRoom(dbFor(uid), 'room', uid, profile(uid));
  assert.equal((await getDoc(doc(dbFor(), 'TEAMS', 'room'))).data().members.length, 2);
});

test('a new room can atomically create its owner presence', async () => {
  const db = dbFor('alice'); const ref = doc(db, 'TEAMS', 'new'); const batch = writeBatch(db);
  batch.set(ref, { ...room, createdAt: serverTimestamp() });
  batch.set(doc(ref, 'PRESENCE', 'alice'), { lastSeen: serverTimestamp() });
  await assertSucceeds(batch.commit());
});

test('presence is private, owner-only, server-timed and cannot revive a closed room', async () => {
  const alice = dbFor('alice');
  await assertSucceeds(touchRoomPresence(alice, 'room', 'alice'));
  await assertFails(touchRoomPresence(dbFor('bob'), 'room', 'bob'));
  await assertFails(touchRoomPresence(dbFor('bob'), 'room', 'alice'));
  await assertFails(touchRoomPresence(dbFor(), 'room', 'alice'));
  await assertFails(getDoc(doc(dbFor('bob'), 'TEAMS', 'room', 'PRESENCE', 'alice')));
  await assertFails(setDoc(doc(alice, 'TEAMS', 'room', 'PRESENCE', 'alice'), { lastSeen: new Date(Date.now() + 100000) }));
  await assertFails(setDoc(doc(alice, 'TEAMS', 'room', 'PRESENCE', 'alice'), { lastSeen: serverTimestamp(), email: 'no@example.test' }));
  await updateDoc(doc(alice, 'TEAMS', 'room'), { members: [], closedBy: 'alice', closedAt: serverTimestamp() });
  await assertFails(touchRoomPresence(alice, 'room', 'alice'));
  await assert.rejects(joinRoom(dbFor('bob'), 'room', 'bob', profile('bob')), RoomError);
  await leaveRoom(alice, 'room', 'alice');
  assert.equal((await getDoc(doc(alice, 'TEAMS', 'room'))).exists(), false);
});

test('cleanup retries safely across batches larger than 400 messages', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore(); const batch = writeBatch(db);
    for (let i = 0; i < 405; i++) batch.set(doc(db, 'TEAMS', 'room', 'CHAT_MESSAGES', `m${i}`), { message: 'test' });
    await batch.commit();
    await updateDoc(doc(db, 'TEAMS', 'room'), { members: [], closedBy: 'alice', closedAt: new Date() });
  });
  await leaveRoom(dbFor('alice'), 'room', 'alice');
  assert.equal((await getDoc(doc(dbFor(), 'TEAMS', 'room'))).exists(), false);
});

test('known room errors are actionable and unexpected SDK details are not exposed', () => {
  assert.equal(roomErrorMessage(new RoomError('팀 인원이 꽉 찼습니다.')), '팀 인원이 꽉 찼습니다.');
  assert.match(roomErrorMessage({ code: 'permission-denied' }), /접근 권한/);
  assert.match(roomErrorMessage({ code: 'unavailable' }), /인터넷/);
  assert.doesNotMatch(roomErrorMessage(new Error('secret-token-or-private-path')), /secret-token/);
});
