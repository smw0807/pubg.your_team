import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDocs, setLogLevel, writeBatch } from 'firebase/firestore';
import { teamListQuery, subscribeTeams, TEAM_PAGE_SIZE } from '../app/services/teamList.ts';
import { chatHistoryQuery, createChatHistorySource, CHAT_PAGE_SIZE } from '../app/services/chatHistory.ts';

let env;
const filters = { platform: 'steam', gameType: 'all', mode: 'all', tier: 'all' };
before(async () => {
  setLogLevel('silent'); assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(localhost|127\.0\.0\.1):\d+$/);
  env = await initializeTestEnvironment({ projectId: 'demo-pubg-pagination', firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore(); const batch = writeBatch(db);
    for (let i = 0; i < 45; i++) batch.set(doc(db, 'TEAMS', `team-${String(i).padStart(3, '0')}`), { title: 'Pagination', description: '', platform: 'steam', mode: 'squad', tier: null, damage: null, isRanked: true, members: i >= 25 ? [] : ['alice'], createdAt: new Date(1000), ...(i >= 25 ? { closedAt: new Date(2000), closedBy: 'alice' } : {}) });
    for (let i = 0; i < 120; i++) batch.set(doc(db, 'TEAMS', 'team-000', 'CHAT_MESSAGES', `message-${String(i).padStart(3, '0')}`), { type: 'user', uid: 'alice', senderId: 'alice', sender: 'Alice', message: `message ${i}`, createdAt: new Date(1000) });
    await batch.commit();
  });
});
after(async () => env?.cleanup());

test('team cursor pages with tied timestamps are bounded and have no skips or duplicates', async () => {
  const db = env.unauthenticatedContext().firestore(); let cursor; const ids = [];
  for (let i = 0; i < 3; i++) {
    const result = await getDocs(teamListQuery(db, filters, cursor)); assert.ok(result.size <= TEAM_PAGE_SIZE + 1);
    const page = result.docs.slice(0, TEAM_PAGE_SIZE); ids.push(...page.map((d) => d.id)); cursor = page.at(-1);
  }
  assert.equal(ids.length, 45); assert.equal(new Set(ids).size, 45); assert.equal(ids[0], 'team-044'); assert.equal(ids.at(-1), 'team-000');
});

test('all-closed first team page still exposes a cursor to the next page', async () => {
  let stop;
  try {
    const result = await new Promise((resolve, reject) => {
      stop = subscribeTeams(env.unauthenticatedContext().firestore())(filters, (teams, cached, page) => { if (!cached) resolve({ teams, page }); }, reject);
    });
    assert.deepEqual(result.teams, []); assert.equal(result.page.hasNext, true); assert.equal(result.page.cursor.id, 'team-025');
  } finally { stop?.(); }
});

test('chat recent window and older pages remain member-only and traverse timestamp ties', async () => {
  const db = env.authenticatedContext('alice').firestore(); const source = createChatHistorySource(db);
  const recent = await getDocs(chatHistoryQuery(db, 'team-000')); assert.equal(recent.size, CHAT_PAGE_SIZE);
  assert.equal(recent.docs[0].id, 'message-119'); assert.equal(recent.docs.at(-1).id, 'message-070');
  const older = await source.older('team-000', recent.docs.at(-1)); assert.equal(older.entries.length, 50); assert.equal(older.hasOlder, true);
  const oldest = await source.older('team-000', older.entries.at(-1).cursor); assert.equal(oldest.entries.length, 20); assert.equal(oldest.hasOlder, false);
  const ids = [...recent.docs.map((v) => v.id), ...older.entries.map((v) => v.message.id), ...oldest.entries.map((v) => v.message.id)];
  assert.equal(new Set(ids).size, 120);
  await assertFails(getDocs(chatHistoryQuery(env.unauthenticatedContext().firestore(), 'team-000')));
  await assertFails(createChatHistorySource(env.authenticatedContext('outsider').firestore()).older('team-000', recent.docs.at(-1)));
});
