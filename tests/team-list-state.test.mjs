import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, nextTick, ref } from 'vue';
import useTeamList from '../app/composables/useTeamList.ts';
import { teamListError } from '../app/services/teamList.ts';

const defaults = { platform: 'steam', gameType: 'all', mode: 'all', tier: 'all' };
function setup() {
  const requests = [];
  const filters = ref({ ...defaults });
  const scope = effectScope();
  const state = scope.run(() => useTeamList(filters, (filter, next, error) => {
    const request = { filter, next, error, stopped: false };
    requests.push(request);
    return () => { request.stopped = true; };
  }));
  return { requests, filters, scope, state };
}

test('list does not subscribe during setup/SSR, and start is idempotent', () => {
  const { requests, state, scope } = setup();
  assert.equal(requests.length, 0);
  state.start(); state.start();
  assert.equal(requests.length, 1);
  assert.equal(state.isLoading.value, true);
  requests[0].next([], false);
  assert.equal(state.isLoading.value, false);
  assert.equal(state.hasLoaded.value, true);
  assert.deepEqual(state.teams.value, []);
  scope.stop();
});

test('filter changes stop old subscriptions and ignore late success/error callbacks', async () => {
  const { requests, state, filters, scope } = setup();
  state.start();
  requests[0].next([{ id: 'old' }], false);
  filters.value = { ...defaults, platform: 'kakao' };
  await nextTick();
  assert.equal(requests[0].stopped, true);
  assert.deepEqual(state.teams.value, []);
  assert.equal(state.hasLoaded.value, false);
  requests[1].next([{ id: 'new' }], false);
  requests[0].next([{ id: 'stale' }], false);
  requests[0].error(new Error('late failure'));
  assert.deepEqual(state.teams.value, [{ id: 'new' }]);
  assert.equal(state.errorMessage.value, '');
  scope.stop();
});

test('refresh preserves visible results, reports failure, and can retry', () => {
  const { requests, state, scope } = setup();
  state.start();
  requests[0].next([{ id: 'room' }], false);
  state.refresh();
  assert.equal(requests[0].stopped, true);
  assert.deepEqual(state.teams.value, [{ id: 'room' }]);
  requests[1].error({ code: 'unavailable' });
  assert.equal(state.isLoading.value, false);
  assert.match(state.errorMessage.value, /인터넷/);
  state.refresh();
  requests[2].next([], false);
  assert.equal(state.errorMessage.value, '');
  assert.deepEqual(state.teams.value, []);
  scope.stop();
});

test('cached results are distinguished from server-confirmed results', () => {
  const { requests, state, scope } = setup();
  state.start();
  requests[0].next([], true);
  assert.equal(state.fromCache.value, true);
  requests[0].next([], false);
  assert.equal(state.fromCache.value, false);
  scope.stop();
});

test('disposing scope stops listeners and prevents later mutation or refresh', () => {
  const { requests, state, scope } = setup();
  state.start(); scope.stop();
  assert.equal(requests[0].stopped, true);
  requests[0].next([{ id: 'late' }], false);
  requests[0].error(new Error('late'));
  state.refresh();
  assert.deepEqual(state.teams.value, []);
  assert.equal(state.errorMessage.value, '');
  assert.equal(requests.length, 1);
});

test('synchronous subscription errors are recoverable and sanitized', () => {
  const scope = effectScope();
  const state = scope.run(() => useTeamList(ref(defaults), () => { throw new Error('private-path'); }));
  state.start();
  assert.equal(state.isLoading.value, false);
  assert.match(state.errorMessage.value, /다시 시도/);
  assert.doesNotMatch(state.errorMessage.value, /private/);
  assert.match(teamListError({ code: 'permission-denied' }), /권한/);
  scope.stop();
});

test('multiple filter resets in one tick create only one replacement subscription', async () => {
  const { requests, state, filters, scope } = setup();
  state.start();
  filters.value.gameType = 'ranked';
  // The production input is a computed value; replace snapshots to emulate it.
  filters.value = { ...filters.value, mode: 'duo' };
  filters.value = { ...filters.value, tier: null };
  await nextTick();
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1].filter, { ...defaults, gameType: 'ranked', mode: 'duo', tier: null });
  scope.stop();
});

test('offline/online and visible-tab recovery refresh once and remove event handlers on disposal', () => {
  const originals = Object.fromEntries(['window', 'document', 'navigator'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const browserWindow = new EventTarget();
  const browserDocument = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const browserNavigator = { onLine: false };
  let scope;
  try {
    for (const [key, value] of Object.entries({ window: browserWindow, document: browserDocument, navigator: browserNavigator })) {
      Object.defineProperty(globalThis, key, { configurable: true, value });
    }
    const fixture = setup(); scope = fixture.scope;
    const { state, requests } = fixture;
    state.start();
    assert.equal(state.isOffline.value, true);
    browserNavigator.onLine = true;
    browserWindow.dispatchEvent(new Event('online'));
    assert.equal(state.isOffline.value, false);
    assert.equal(requests.length, 2);
    browserDocument.visibilityState = 'hidden';
    browserDocument.dispatchEvent(new Event('visibilitychange'));
    assert.equal(requests.length, 2);
    browserDocument.visibilityState = 'visible';
    browserDocument.dispatchEvent(new Event('visibilitychange'));
    assert.equal(requests.length, 3);
    scope.stop();
    browserWindow.dispatchEvent(new Event('online'));
    browserDocument.dispatchEvent(new Event('visibilitychange'));
    assert.equal(requests.length, 3);
  } finally {
    scope?.stop();
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
