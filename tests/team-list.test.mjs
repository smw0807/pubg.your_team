import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDocs, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';
import { subscribeTeams, teamListQuery } from '../app/services/teamList.ts';

let env;
const defaults = { platform: 'steam', gameType: 'all', mode: 'all', tier: 'all' };
const room = { title: 'List test', description: '', platform: 'steam', mode: 'duo', tier: null, damage: null, isRanked: true, members: ['alice'], createdAt: new Date(1000) };
before(async () => {
  setLogLevel('silent');
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
  env = await initializeTestEnvironment({ projectId: 'demo-pubg-team-list', firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [id, extra] of [
      ['steam', {}], ['kakao', { platform: 'kakao' }],
      ['unranked', { isRanked: false, mode: 'squad', tier: 'gold', createdAt: new Date(2000) }],
      ['closed', { members: [], closedAt: new Date(), closedBy: 'alice' }],
    ]) await setDoc(doc(db, 'TEAMS', id), { ...room, ...extra });
  });
});
after(async () => env?.cleanup());

test('server query applies platform, type, mode, null tier and newest-first order', async () => {
  const db = env.unauthenticatedContext().firestore();
  const ids = async (filters) => (await getDocs(teamListQuery(db, { ...defaults, ...filters }))).docs.map((entry) => entry.id);
  assert.deepEqual(await ids({ platform: 'kakao' }), ['kakao']);
  assert.deepEqual(await ids({ gameType: 'unranked', mode: 'squad', tier: 'gold' }), ['unranked']);
  assert.deepEqual(await ids({ gameType: 'unranked', tier: null }), []);
  const all = await ids({});
  assert.equal(all[0], 'unranked');
  assert.equal(all.includes('kakao'), false);
});

test('live list excludes closed rooms, converts timestamps and reflects member/closure updates', async () => {
  const db = env.unauthenticatedContext().firestore();
  let stop;
  let notify;
  let latest;
  const waitFor = (predicate) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Snapshot timeout')), 8000);
    notify = (teams) => { if (predicate(teams)) { clearTimeout(timer); notify = undefined; resolve(teams); } };
    if (latest) notify(latest);
  });
  try {
    stop = subscribeTeams(db)(defaults, (teams, cached) => {
      if (!cached) { latest = teams; notify?.(teams); }
    }, (error) => { throw error; });
    const first = await waitFor((teams) => teams.some((team) => team.id === 'steam'));
    assert.equal(first.some((team) => team.id === 'closed'), false);
    assert.ok(first[0].createdAt instanceof Date);
    await env.withSecurityRulesDisabled((context) => updateDoc(doc(context.firestore(), 'TEAMS', 'steam'), { members: ['alice', 'bob'] }));
    await waitFor((teams) => teams.find((team) => team.id === 'steam')?.members.length === 2);
    await env.withSecurityRulesDisabled((context) => updateDoc(doc(context.firestore(), 'TEAMS', 'steam'), { members: [], closedAt: new Date(), closedBy: 'alice' }));
    await waitFor((teams) => !teams.some((team) => team.id === 'steam'));
  } finally { stop?.(); }
});
