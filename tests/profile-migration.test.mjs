import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { migratePublicProfiles } from '../scripts/migrate-public-profiles.mjs';

let app;
let db;
before(() => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
  app = initializeApp({ projectId: 'demo-pubg-migration' }, 'migration-tests');
  db = getFirestore(app);
});
after(async () => deleteApp(app));

test('migration defaults to dry-run, strips PII, preserves legacy data and never overwrites current nicknames', async () => {
  const legacy = { id: 'wrong-id', name: 'Private Name', email: 'private@example.test', steamNickname: ' Steam_name ', kakaoNickname: 'Kakao_name', extra: 'private' };
  await db.doc('PROFILES/alice').set(legacy);
  await db.doc('PROFILES/bob').set({ ...legacy, steamNickname: 'old_name' });
  const current = { id: 'bob', steamNickname: 'new_name', kakaoNickname: '' };
  await db.doc('PUBLIC_PROFILES/bob').set(current);
  await db.doc('PROFILES/invalid').set({ steamNickname: 'a'.repeat(65) });

  const dry = await migratePublicProfiles(db, { pageSize: 1 });
  assert.equal(dry.wouldCreate, 1);
  assert.equal(dry.existing, 1);
  assert.equal(dry.invalid, 1);
  assert.equal((await db.doc('PUBLIC_PROFILES/alice').get()).exists, false);

  const applied = await migratePublicProfiles(db, { apply: true, pageSize: 1 });
  assert.equal(applied.created, 1);
  assert.deepEqual((await db.doc('PUBLIC_PROFILES/alice').get()).data(), { id: 'alice', steamNickname: 'Steam_name', kakaoNickname: 'Kakao_name' });
  assert.deepEqual((await db.doc('PROFILES/alice').get()).data(), legacy);
  assert.deepEqual((await db.doc('PUBLIC_PROFILES/bob').get()).data(), current);
  assert.equal((await migratePublicProfiles(db, { apply: true })).created, 0);
});
