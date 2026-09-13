import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PubgRateLimitError, PubgUnauthorizedError, PubgNotFoundError } from 'pubg-kit';
import { buildRankedStats, rankedMode, parseStatsQuery, createRequestBudget, createStatsCache, statsError, StatsError } from '../server/utils/pubgStats.ts';
import { createPubgService } from '../server/utils/pubgService.ts';
import { averageDamage, formatStat, recentMatchUrl } from '../app/utils/statsFormat.ts';

const result = { seasonId: 'season-1', fetchedAt: new Date(0).toISOString() };
const response = (modes) => ({ data: { attributes: { rankedGameModeStats: modes } } });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

test('stats query rejects duplicate values, invalid platform and unsafe names', () => {
  assert.deepEqual(parseStatsQuery({ platform: 'steam', playerName: 'Player_1' }), { platform: 'steam', playerName: 'Player_1' });
  for (const input of [{ platform: ['steam'], playerName: 'Player' }, { platform: 'steam', playerName: ['Player'] }, { platform: 'invalid', playerName: 'Player' }, { platform: 'steam', playerName: '../secret' }]) assert.throws(() => parseStatsQuery(input), (error) => error.statusCode === 400);
});

test('ranked stats separate all perspectives and use only ranked damage/rounds', () => {
  const stats = buildRankedStats(response({ squad: { roundsPlayed: 10, damageDealt: 1234, kdr: 2.5 }, 'squad-fpp': { roundsPlayed: 2, damageDealt: 900 }, duo: { roundsPlayed: 0 }, 'duo-fpp': { roundsPlayed: 3 } }), 'season', 'Innocent', 0);
  assert.equal(averageDamage(stats.squad.damageDealt, stats.squad.roundsPlayed), 123.4);
  assert.equal(stats.squad.kdr, 2.5);
  assert.equal(stats.squadFpp.damageDealt, 900);
  assert.equal(stats.duo, undefined);
  assert.equal(stats.duoFpp.damageDealt, null);
  assert.equal(stats.squad.assists, null);
  assert.equal(stats.fetchedAt, new Date(0).toISOString());
});

test('empty ranked data is valid but malformed upstream data is an error, not an empty season', () => {
  assert.equal(buildRankedStats(response({}), 'season', undefined).squad, undefined);
  for (const data of [null, {}, { data: { attributes: {} } }, response({ squad: {} })]) assert.throws(() => buildRankedStats(data, 'season', undefined), (error) => error.statusCode === 502);
  assert.equal(rankedMode({ roundsPlayed: 1, damageDealt: NaN, assists: -1 }).damageDealt, null);
  assert.equal(averageDamage(null, 10), null);
  assert.equal(averageDamage(100, 0), null);
  assert.equal(formatStat(null), '—');
  assert.equal(formatStat(Infinity), '—');
  assert.equal(formatStat(0), '0');
});

test('upstream failures are sanitized and distinguish rate limits, missing players and timeouts', () => {
  for (const [error, status] of [[new PubgRateLimitError('secret'),429], [new PubgUnauthorizedError('secret'),503], [new PubgNotFoundError('secret'),404], [{code:'ECONNABORTED',config:{key:'secret'}},504], [new Error('secret'),502]]) {
    const safe = statsError(error);
    assert.equal(safe.statusCode, status);
    assert.doesNotMatch(JSON.stringify(safe) + safe.message, /secret/);
  }
});

test('upstream budget fails immediately at the limit and resets after the sliding window', () => {
  let time = 0; const reserve = createRequestBudget(() => time, 2);
  reserve(); reserve();
  assert.throws(reserve, (error) => error.statusCode === 429 && error.retryAfter === 60);
  time = 59999; assert.throws(reserve);
  time = 60000; assert.doesNotThrow(reserve);
});

test('same query coalesces in flight and caches for five minutes, with platform isolation', async () => {
  let time = 0; let calls = 0; const gate = deferred();
  const fetch = createStatsCache(async () => { calls++; await gate.promise; return result; }, () => time);
  const one = fetch('steam','Player'); const two = fetch('steam','Player');
  await Promise.resolve(); assert.equal(calls,1);
  gate.resolve(); await Promise.all([one,two]);
  await fetch('steam','Player'); assert.equal(calls,1);
  await fetch('kakao','Player'); assert.equal(calls,2);
  time = 300000; await fetch('steam','Player'); assert.equal(calls,3);
});

test('negative cache expires and transient failures remain retryable', async () => {
  let time = 0; let calls = 0;
  const fetch = createStatsCache(async () => { calls++; if(calls===1) throw new StatsError(404,'missing'); return result; }, () => time);
  await assert.rejects(fetch('steam','Missing'));
  await assert.rejects(fetch('steam','Missing')); assert.equal(calls,1);
  time=30000; await fetch('steam','Missing'); assert.equal(calls,2);
  let failed = true;
  const retry = createStatsCache(async()=>{if(failed)throw new Error('private'); return result;});
  await assert.rejects(retry('steam','Player')); failed=false;
  assert.equal(await retry('steam','Player'),result);
});

test('rate-limit cooldown protects other names while previously cached results remain usable', async () => {
  let time=0; let calls=0;
  const fetch=createStatsCache(async(_platform,name)=>{calls++;if(name==='Busy')throw new StatsError(429,'busy',2);return result;},()=>time);
  await fetch('steam','Cached');
  await assert.rejects(fetch('steam','Busy'));
  await assert.rejects(fetch('steam','Other'),error=>error.retryAfter===2);
  await fetch('steam','Cached'); assert.equal(calls,2);
  time=2000; await fetch('steam','Other'); assert.equal(calls,3);
});

test('response cache and in-flight requests are bounded', async () => {
  let calls=0;
  const fetch=createStatsCache(async()=>{calls++;return result;},()=>0,2);
  for(const name of ['One','Two','Three','One']) await fetch('steam',name);
  assert.equal(calls,4);
  const gate=deferred(); const limited=createStatsCache(async()=>{await gate.promise;return result;});
  const pending=Array.from({length:10},(_,i)=>limited('steam',`Player${i}`));
  await assert.rejects(limited('steam','Extra'),error=>error.statusCode===429);
  gate.resolve();await Promise.all(pending);
});

test('service shares season lookups and never requests general season stats', async () => {
  let playerCalls=0; let seasonCalls=0; let rankedCalls=0; let interceptor;
  const client={getHttp:()=>({interceptors:{request:{use(fn){interceptor=fn;}}}}),shard:()=>({
    players:{getByNames:async([name])=>{playerCalls++;return[{id:name,attributes:{banType:'Innocent'}}];}},
    seasons:{getAll:async()=>{seasonCalls++;return[{id:'season',attributes:{isCurrentSeason:true}}];}},
    stats:{getPlayerRankedStats:async()=>{rankedCalls++;return response({squad:{roundsPlayed:1,damageDealt:300}});},getPlayerStats:()=>{throw Error('General stats must not be requested');}},
  })};
  const fetch=createPubgService('test-only',client);
  await Promise.all([fetch('steam','One'),fetch('steam','Two')]);
  await fetch('steam','One');
  assert.deepEqual([playerCalls,seasonCalls,rankedCalls],[2,1,2]);
  for(let i=0;i<10;i++)interceptor({});
  assert.throws(()=>interceptor({}),error=>error.statusCode===429);
});

test('recent match links fail closed when unconfigured or unsafe', () => {
  assert.equal(recentMatchUrl('', 'steam','Player'),null);
  assert.equal(recentMatchUrl('javascript:alert(1)','steam','Player'),null);
  assert.equal(recentMatchUrl('https://user:pass@example.com','steam','Player'),null);
  assert.equal(recentMatchUrl('https://example.com','steam','../secret'),null);
  assert.equal(recentMatchUrl('https://example.com/base/?secret=unused','steam','Player_1'),'https://example.com/base/player/steam/Player_1');
});
