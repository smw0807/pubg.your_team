import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, runTransaction,
  serverTimestamp, setDoc, updateDoc,
  setLogLevel,
} from 'firebase/firestore';

let env;
const profile = (id) => ({ id, steamNickname: `${id}_steam`, kakaoNickname: `${id}_kakao` });
const team = (overrides = {}) => ({
  title: '함께 플레이해요', description: '', mode: 'duo', tier: null, damage: null,
  platform: 'steam', isRanked: true, members: ['alice'], createdAt: new Date(), ...overrides,
});
const dbFor = (uid) => uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
const teamRef = (uid) => doc(dbFor(uid), 'TEAMS', 'room');
const messageRef = (uid, id = 'message') => doc(dbFor(uid), 'TEAMS', 'room', 'CHAT_MESSAGES', id);
const message = (overrides = {}) => ({
  type: 'user', uid: 'alice', senderId: 'alice', sender: 'alice_steam',
  message: '안녕하세요', createdAt: serverTimestamp(), ...overrides,
});

before(async () => {
  setLogLevel('silent');
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
  env = await initializeTestEnvironment({
    projectId: 'demo-pubg-team',
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const uid of ['alice', 'bob', 'carol']) await setDoc(doc(db, 'PUBLIC_PROFILES', uid), profile(uid));
    await setDoc(doc(db, 'PROFILES', 'alice'), { ...profile('alice'), name: 'Private Name', email: 'private@example.test' });
    await setDoc(doc(db, 'TEAMS', 'room'), team());
  });
});

test('legacy PII is owner-readable only and cannot be listed or rewritten', async () => {
  await assertSucceeds(getDoc(doc(dbFor('alice'), 'PROFILES', 'alice')));
  await assertFails(getDoc(doc(dbFor('bob'), 'PROFILES', 'alice')));
  await assertFails(getDoc(doc(dbFor(), 'PROFILES', 'alice')));
  await assertFails(getDocs(collection(dbFor('alice'), 'PROFILES')));
  await assertFails(setDoc(doc(dbFor('alice'), 'PROFILES', 'alice'), profile('alice')));
});

test('public nicknames require sign-in and cannot be enumerated', async () => {
  const result = await assertSucceeds(getDoc(doc(dbFor('bob'), 'PUBLIC_PROFILES', 'alice')));
  assert.deepEqual(Object.keys(result.data()).sort(), ['id', 'kakaoNickname', 'steamNickname']);
  await assertFails(getDoc(doc(dbFor(), 'PUBLIC_PROFILES', 'alice')));
  await assertFails(getDocs(collection(dbFor('bob'), 'PUBLIC_PROFILES')));
});

test('only the owner can write a nickname profile with exactly the public fields', async () => {
  const ref = doc(dbFor('alice'), 'PUBLIC_PROFILES', 'alice');
  await assertSucceeds(setDoc(ref, profile('alice')));
  await assertFails(setDoc(doc(dbFor('bob'), 'PUBLIC_PROFILES', 'alice'), profile('alice')));
  for (const changes of [{ id: 'bob' }, { email: 'leak@example.test' }, { name: 'private' }, { steamNickname: 'a'.repeat(65) }, { kakaoNickname: '   ' }]) {
    await assertFails(setDoc(ref, { ...profile('alice'), ...changes }));
  }
});

test('even an accidentally imported public document with PII cannot be read', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'PUBLIC_PROFILES', 'alice'), { ...profile('alice'), email: 'private@example.test' });
  });
  await assertFails(getDoc(doc(dbFor('bob'), 'PUBLIC_PROFILES', 'alice')));
});

test('an owner can atomically migrate legacy nicknames without making PII readable', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await deleteDoc(doc(context.firestore(), 'PUBLIC_PROFILES', 'alice'));
  });
  const db = dbFor('alice');
  await assertSucceeds(runTransaction(db, async (transaction) => {
    const target = doc(db, 'PUBLIC_PROFILES', 'alice');
    assert.equal((await transaction.get(target)).exists(), false);
    const legacy = await transaction.get(doc(db, 'PROFILES', 'alice'));
    transaction.set(target, { id: 'alice', steamNickname: legacy.data().steamNickname, kakaoNickname: legacy.data().kakaoNickname });
  }));
  assert.deepEqual((await getDoc(doc(dbFor('bob'), 'PUBLIC_PROFILES', 'alice'))).data(), profile('alice'));
  await assertFails(getDoc(doc(dbFor('bob'), 'PROFILES', 'alice')));
});

test('team metadata remains accessible to visitors', async () => {
  await assertSucceeds(getDocs(collection(dbFor(), 'TEAMS')));
  await assertSucceeds(getDoc(teamRef()));
});

test('team creation requires authentication, own seat and a saved platform nickname', async () => {
  const data = team({ createdAt: serverTimestamp() });
  await assertSucceeds(setDoc(doc(dbFor('alice'), 'TEAMS', 'new'), data));
  await assertFails(setDoc(doc(dbFor(), 'TEAMS', 'anonymous'), data));
  await assertFails(setDoc(doc(dbFor('bob'), 'TEAMS', 'spoofed'), data));
  await assertFails(setDoc(doc(dbFor('no-profile'), 'TEAMS', 'missing-profile'), { ...data, members: ['no-profile'] }));
  await setDoc(doc(dbFor('bob'), 'PUBLIC_PROFILES', 'bob'), { ...profile('bob'), steamNickname: '' });
  await assertFails(setDoc(doc(dbFor('bob'), 'TEAMS', 'missing-nickname'), { ...data, members: ['bob'] }));
});

test('team creation rejects forged dates, empty input, invalid enums and additional fields', async () => {
  for (const changes of [
    { createdAt: new Date(0) }, { title: '   ' }, { title: 'a'.repeat(101) },
    { description: 'a'.repeat(1001) }, { platform: 'invalid' }, { mode: 'solo' },
    { tier: 'invalid' }, { damage: -1 }, { damage: 10001 }, { members: ['alice', 'bob'] },
    { closedBy: 'alice' }, { email: 'private@example.test' },
  ]) {
    await assertFails(setDoc(doc(dbFor('alice'), 'TEAMS', 'invalid'), team({ createdAt: serverTimestamp(), ...changes })));
  }
});

test('joining can only add the caller and cannot edit room metadata', async () => {
  await assertFails(updateDoc(teamRef('bob'), { members: ['alice', 'carol'] }));
  await assertFails(updateDoc(teamRef('bob'), { members: ['bob'] }));
  await assertFails(updateDoc(teamRef('bob'), { members: ['alice', 'bob'], title: 'hijacked' }));
  await assertFails(updateDoc(teamRef('bob'), { members: ['alice', 'bob', 'bob'] }));
  await assertSucceeds(updateDoc(teamRef('bob'), { members: ['alice', 'bob'] }));
});

test('a full team cannot be joined even by bypassing the UI', async () => {
  await updateDoc(teamRef('bob'), { members: ['alice', 'bob'] });
  await assertFails(updateDoc(teamRef('carol'), { members: ['alice', 'bob', 'carol'] }));
});

test('concurrent attempts to claim the last seat admit exactly one caller', async () => {
  const join = (uid) => {
    const db = dbFor(uid);
    const ref = doc(db, 'TEAMS', 'room');
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      transaction.update(ref, { members: [...snapshot.data().members, uid] });
    });
  };
  const results = await Promise.allSettled([join('bob'), join('carol')]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await getDoc(teamRef('alice'))).data().members.length, 2);
});

test('a member can leave only their own seat', async () => {
  await updateDoc(teamRef('bob'), { members: ['alice', 'bob'] });
  await assertFails(updateDoc(teamRef('bob'), { members: ['bob'] }));
  await assertSucceeds(updateDoc(teamRef('bob'), { members: ['alice'] }));
  await assertFails(deleteDoc(teamRef('alice')));
});

test('members may send messages; outsiders cannot read or send them', async () => {
  await assertSucceeds(setDoc(messageRef('alice'), message()));
  await assertSucceeds(getDocs(collection(dbFor('alice'), 'TEAMS', 'room', 'CHAT_MESSAGES')));
  await assertFails(getDoc(messageRef('bob')));
  await assertFails(getDocs(collection(dbFor(), 'TEAMS', 'room', 'CHAT_MESSAGES')));
  await assertFails(setDoc(messageRef('bob', 'outsider'), message({ uid: 'bob', senderId: 'bob', sender: 'bob_steam' })));
});

test('message sender, type, content and timestamp are enforced by rules', async () => {
  for (const changes of [
    { uid: 'bob' }, { senderId: 'bob' }, { sender: 'bob_steam' }, { type: 'system' },
    { message: '' }, { message: '   ' }, { message: 'a'.repeat(2001) },
    { createdAt: new Date(0) }, { extra: true },
  ]) await assertFails(setDoc(messageRef('alice'), message(changes)));
  await setDoc(messageRef('alice'), message());
  await assertFails(updateDoc(messageRef('alice'), { message: 'rewritten' }));
  await assertFails(deleteDoc(messageRef('alice')));
});

test('the last member closes the team before cleaning up; no new joins or messages are allowed', async () => {
  await setDoc(messageRef('alice'), message());
  await assertFails(updateDoc(teamRef('bob'), { members: [], closedBy: 'bob', closedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(teamRef('alice'), { members: [], closedBy: 'alice', closedAt: serverTimestamp() }));
  await assertFails(updateDoc(teamRef('bob'), { members: ['bob'] }));
  await assertFails(setDoc(messageRef('alice', 'late'), message()));
  await assertFails(deleteDoc(messageRef('bob')));
  await assertFails(deleteDoc(teamRef('bob')));
  await assertSucceeds(getDocs(collection(dbFor('alice'), 'TEAMS', 'room', 'CHAT_MESSAGES')));
  await assertSucceeds(deleteDoc(messageRef('alice')));
  await assertSucceeds(deleteDoc(teamRef('alice')));
});

test('unconfigured collections are denied by default', async () => {
  await assertFails(setDoc(doc(dbFor('alice'), 'FREE_BOARD', 'post'), { text: 'unexpected' }));
  await assertFails(getDocs(collection(dbFor('alice'), 'UNKNOWN')));
});
