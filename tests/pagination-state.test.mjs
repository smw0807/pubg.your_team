import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, nextTick, ref, shallowRef } from 'vue';
import useChatHistory from '../app/composables/useChatHistory.ts';
import useTeamList from '../app/composables/useTeamList.ts';
import useChatScroll from '../app/composables/useChatScroll.ts';
import { mergeChatEntries } from '../app/services/chatHistory.ts';
import { roomSnapshotState } from '../app/services/room.ts';

const entry = (n) => ({ message: { id: String(n).padStart(4, '0'), createdAt: new Date(n * 1000), message: `message ${n}` }, seconds: n, nanoseconds: 0, cursor: { id: String(n), metadata: { hasPendingWrites: false } } });
const batch = (values, hasOlder = true, fromCache = false) => ({ entries: values.map(entry).reverse(), hasOlder, fromCache });

test('a stale cache cannot end a newly joined room before server membership confirmation', () => {
  const cached = { fromCache: true, hasPendingWrites: false };
  const confirmed = { fromCache: false, hasPendingWrites: false };
  for (const data of [undefined, { members: ['other'] }, { members: [], closedAt: new Date() }]) {
    assert.equal(roomSnapshotState(data, 'alice', cached), 'unconfirmed');
    assert.equal(roomSnapshotState(data, 'alice', { ...confirmed, hasPendingWrites: true }), 'unconfirmed');
    assert.equal(roomSnapshotState(data, 'alice', confirmed), 'ended');
  }
  assert.equal(roomSnapshotState({ members: ['alice'] }, 'alice', confirmed), 'active');
});
function chat() {
  const scope = effectScope(); const subscriptions = []; const requests = [];
  const state = scope.run(() => useChatHistory({
    subscribe: (room, next, error) => { const sub = { room, next, error, stopped: false }; subscriptions.push(sub); return () => { sub.stopped = true; }; },
    older: (room, cursor) => new Promise((resolve, reject) => requests.push({ room, cursor, resolve, reject })),
  }));
  return { state, scope, subscriptions, requests };
}

test('chat subscribes only after start, merges older pages and deduplicates live updates', async () => {
  const { state, scope, subscriptions, requests } = chat(); assert.equal(subscriptions.length, 0);
  state.start('room'); subscriptions[0].next(batch([4, 5, 6]));
  const pending = state.loadOlder(); await state.loadOlder(); assert.equal(requests.length, 1); assert.equal(requests[0].cursor.id, '4');
  subscriptions[0].next(batch([5, 6, 7]));
  requests[0].resolve(batch([1, 2, 3, 4], false)); await pending;
  assert.deepEqual(state.messages.value.map((m) => Number(m.id)), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(state.hasOlder.value, false); assert.equal(state.isLoadingOlder.value, false); scope.stop();
});

test('without history only the recent window is retained', () => {
  const { state, scope, subscriptions } = chat(); state.start('room');
  subscriptions[0].next(batch([1, 2, 3])); subscriptions[0].next(batch([2, 3, 4]));
  assert.deepEqual(state.messages.value.map((m) => Number(m.id)), [2, 3, 4]); scope.stop();
});

test('failed older request preserves cursor and history and can retry', async () => {
  const { state, scope, subscriptions, requests } = chat(); state.start('room'); subscriptions[0].next(batch([4, 5]));
  let pending = state.loadOlder(); requests[0].reject({ code: 'unavailable' }); await pending;
  assert.match(state.historyError.value, /인터넷/); assert.equal(state.messages.value.length, 2);
  pending = state.loadOlder(); assert.equal(requests[1].cursor.id, '4'); requests[1].resolve(batch([2, 3])); await pending;
  assert.equal(state.historyError.value, ''); assert.deepEqual(state.messages.value.map((m) => Number(m.id)), [2, 3, 4, 5]); scope.stop();
});

test('room switch, pause and disposal ignore late pages and subscriptions', async () => {
  const { state, scope, subscriptions, requests } = chat(); state.start('one'); subscriptions[0].next(batch([1, 2]));
  const old = state.loadOlder(); state.start('two'); subscriptions[1].next(batch([8, 9]));
  subscriptions[0].next(batch([20])); requests[0].resolve(batch([0])); await old;
  assert.deepEqual(state.messages.value.map((m) => Number(m.id)), [8, 9]);
  const newer = state.loadOlder(); state.pause(); requests[1].resolve(batch([6, 7])); await newer;
  assert.deepEqual(state.messages.value.map((m) => Number(m.id)), [8, 9]);
  scope.stop(); subscriptions[1].next(batch([30])); assert.deepEqual(state.messages.value, []);
  state.start('three'); assert.equal(subscriptions.length, 2);
});

test('cached or pending-write cursors cannot start a history page', async () => {
  const { state, scope, subscriptions, requests } = chat(); state.start('room'); subscriptions[0].next(batch([3, 4], true, true));
  await state.loadOlder(); assert.equal(requests.length, 0);
  const pending = batch([3, 4]); pending.entries.at(-1).cursor.metadata.hasPendingWrites = true;
  subscriptions[0].next(pending); await state.loadOlder(); assert.equal(requests.length, 0); scope.stop();
});

test('discontinuous live window resets history and invalidates its in-flight page', async () => {
  const { state, scope, subscriptions, requests } = chat(); state.start('room'); subscriptions[0].next(batch([3, 4]));
  const pending = state.loadOlder(); subscriptions[0].next(batch([30, 31]));
  requests[0].resolve(batch([1, 2])); await pending;
  assert.deepEqual(state.messages.value.map((m) => Number(m.id)), [30, 31]); assert.match(state.notice.value, /범위/);
  const page = state.loadOlder(); assert.equal(requests[1].cursor.id, '30'); requests[1].resolve(batch([28, 29])); await page;
  state.start('room'); assert.match(state.notice.value, /다시 연결/); scope.stop();
});

test('history errors are sanitized; incomplete cached pages cannot claim EOF', async () => {
  const { state, scope, subscriptions, requests } = chat(); state.start('room'); subscriptions[0].error(new Error('secret'));
  assert.doesNotMatch(state.error.value, /secret/); subscriptions[0].next(batch([4]));
  const pending = state.loadOlder(); requests[0].resolve(batch([], false, true)); await pending;
  assert.equal(state.hasOlder.value, true); assert.ok(state.historyError.value); scope.stop();
});

test('a reconnect cache cannot conceal a gap between confirmed live windows', async () => {
  const { state, scope, subscriptions, requests } = chat(); state.start('room'); subscriptions[0].next(batch([4, 5]));
  const pending = state.loadOlder(); requests[0].resolve(batch([2, 3])); await pending;
  subscriptions[0].next(batch([30], true, true));
  assert.deepEqual(state.messages.value.map((m) => Number(m.id)), [2, 3, 4, 5]);
  subscriptions[0].next(batch([30, 31]));
  assert.deepEqual(state.messages.value.map((m) => Number(m.id)), [30, 31]); assert.match(state.notice.value, /범위/); scope.stop();
});

test('message ordering retains timestamp nanoseconds and deterministic ID ties', () => {
  const first = { ...entry(1), message: { ...entry(1).message, id: 'Z' }, nanoseconds: 1 };
  const second = { ...entry(1), message: { ...entry(1).message, id: 'a' }, nanoseconds: 1 };
  const third = { ...entry(1), nanoseconds: 2 };
  assert.deepEqual(mergeChatEntries([third, second, first], [first]).map((v) => v.message.id), ['Z', 'a', '0001']);
});

test('team pages retain one subscription and stable raw cursor, even with no open rooms', async () => {
  const scope = effectScope(); const filters = ref({ platform: 'steam', gameType: 'all', mode: 'all', tier: 'all' }); const requests = [];
  const state = scope.run(() => useTeamList(filters, (filter, next, error, cursor) => { const call = { filter, next, error, cursor, stopped: false }; requests.push(call); return () => { call.stopped = true; }; }));
  state.start(); requests[0].next([], false, { cursor: { id: 'closed-boundary' }, hasNext: true });
  state.nextPage(); assert.equal(requests[0].stopped, true); assert.equal(state.pageNumber.value, 2); assert.equal(requests[1].cursor.id, 'closed-boundary');
  state.nextPage(); assert.equal(requests.length, 2);
  requests[1].next([{ id: 'visible' }], false, { cursor: { id: 'last' }, hasNext: false });
  state.previousPage(); assert.equal(state.pageNumber.value, 1); assert.equal(requests[2].cursor, null);
  requests[2].next([], false, { cursor: { id: 'boundary' }, hasNext: true }); state.nextPage();
  filters.value = { ...filters.value, platform: 'kakao' }; await nextTick(); assert.equal(state.pageNumber.value, 1); assert.equal(requests.at(-1).cursor, null);
  requests.at(-2).next([{ id: 'late' }], false); assert.deepEqual(state.teams.value, []); scope.stop();
});

test('cached team results cannot advance a pagination cursor', () => {
  const scope = effectScope(); let next; let calls = 0;
  const state = scope.run(() => useTeamList(ref({ platform: 'steam', gameType: 'all', mode: 'all', tier: 'all' }), (_, callback) => { calls++; next = callback; return () => {}; }));
  state.start(); next([], true, { cursor: { id: 'cached' }, hasNext: true }); state.nextPage(); assert.equal(calls, 1);
  scope.stop(); state.firstPage(); state.previousPage(); state.nextPage(); assert.equal(calls, 1);
});

test('prepending history anchors the visible message even if new messages arrive below', async () => {
  const scope = effectScope(); let rowTop = 100; const row = { isConnected: true, getBoundingClientRect: () => ({ top: rowTop, bottom: rowTop + 100 }) };
  const element = shallowRef({ scrollTop: 0, scrollHeight: 500, clientHeight: 200, getBoundingClientRect: () => ({ top: 90 }), querySelectorAll: () => [row] });
  const count = ref(10); const state = scope.run(() => useChatScroll(element, count));
  await state.preservePosition(async () => { rowTop = 300; element.value.scrollHeight = 1000; count.value = 15; await nextTick(); });
  assert.equal(element.value.scrollTop, 200); assert.equal(state.preservingPosition.value, false); assert.equal(state.hasNewMessages.value, false); scope.stop();
});

test('a full recent window still follows or announces messages when its length stays constant', async () => {
  const scope = effectScope(); const count = ref(50); const latestId = ref('old');
  const element = shallowRef({ scrollTop: 800, scrollHeight: 1000, clientHeight: 200 });
  const state = scope.run(() => useChatScroll(element, count, latestId));
  latestId.value = 'new'; await nextTick(); await nextTick(); assert.equal(element.value.scrollTop, 1000);
  element.value.scrollTop = 0; state.updatePosition(); latestId.value = 'newer'; await nextTick();
  assert.equal(state.hasNewMessages.value, true); assert.equal(element.value.scrollTop, 0); scope.stop();
});
