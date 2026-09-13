import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, nextTick, ref, shallowRef } from 'vue';
import { handleChatEnter, isChatSubmitKey, isNearChatBottom } from '../app/utils/chatInteraction.ts';
import { observeViewportHeight } from '../app/utils/viewport.ts';
import useChatScroll from '../app/composables/useChatScroll.ts';
import useChatComposer from '../app/composables/useChatComposer.ts';

test('Enter sends once, but IME confirmation, Safari 229, Shift and held keys do not', () => {
  const enter = { key: 'Enter', isComposing: false, keyCode: 13, shiftKey: false, repeat: false };
  assert.equal(isChatSubmitKey(enter), true);
  for (const override of [{ key: 'a' }, { isComposing: true }, { keyCode: 229 }, { shiftKey: true }, { repeat: true }]) {
    assert.equal(isChatSubmitKey({ ...enter, ...override }), false);
  }
});

test('chat bottom detection handles short content and fractional scroll positions', () => {
  assert.equal(isNearChatBottom({ scrollHeight: 100, clientHeight: 200, scrollTop: 0 }), true);
  assert.equal(isNearChatBottom({ scrollHeight: 1000, clientHeight: 200, scrollTop: 735.5 }), false);
  assert.equal(isNearChatBottom({ scrollHeight: 1000, clientHeight: 200, scrollTop: 736 }), true);
});

test('IME Enter may commit the candidate without submitting or cancelling its default', () => {
  let prevented = 0; let sent = 0;
  const enter = { key: 'Enter', isComposing: false, keyCode: 13, shiftKey: false, repeat: false, preventDefault: () => { prevented++; } };
  const send = () => { sent++; };
  handleChatEnter({ ...enter, isComposing: true }, send);
  handleChatEnter({ ...enter, keyCode: 229 }, send);
  assert.equal(prevented, 0); assert.equal(sent, 0);
  handleChatEnter(enter, send); assert.equal(prevented, 1); assert.equal(sent, 1);
  handleChatEnter({ ...enter, repeat: true }, send); assert.equal(prevented, 2); assert.equal(sent, 1);
});

test('incoming chat preserves reading position; jump resumes following; dispose stops watching', async () => {
  const scope = effectScope();
  const element = shallowRef({ scrollHeight: 1000, clientHeight: 200, scrollTop: 800 });
  const count = ref(10);
  const state = scope.run(() => useChatScroll(element, count));
  element.value.scrollTop = 100; state.updatePosition();
  count.value++; await nextTick(); await nextTick();
  assert.equal(element.value.scrollTop, 100); assert.equal(state.hasNewMessages.value, true);
  await state.scrollToLatest(); assert.equal(element.value.scrollTop, 1000);
  assert.equal(state.hasNewMessages.value, false);
  element.value.scrollHeight = 1200; count.value++; await nextTick(); await nextTick();
  assert.equal(element.value.scrollTop, 1200);
  scope.stop(); element.value.scrollHeight = 1400; count.value++; await nextTick();
  assert.equal(element.value.scrollTop, 1200);
});

test('existing messages scroll to latest when the panel first mounts', async () => {
  const scope = effectScope(); const element = shallowRef(); const count = ref(40);
  scope.run(() => useChatScroll(element, count));
  element.value = { scrollHeight: 1200, clientHeight: 200, scrollTop: 0 };
  await nextTick(); await nextTick(); assert.equal(element.value.scrollTop, 1200);
  scope.stop();
});

test('send is single-flight, disabled/blank cannot send, newer draft is preserved', async () => {
  const disabled = ref(true); let resolve; const sent = []; let jumps = 0;
  const state = useChatComposer(disabled, (message) => { sent.push(message); return new Promise((done) => { resolve = done; }); }, assert.fail, async () => { jumps++; });
  state.draft.value = 'hello'; await state.sendMessage(); assert.deepEqual(sent, []);
  disabled.value = false; state.draft.value = '  '; await state.sendMessage(); assert.deepEqual(sent, []);
  state.draft.value = 'hello'; const pending = state.sendMessage(); await state.sendMessage();
  assert.deepEqual(sent, ['hello']); assert.equal(state.isSending.value, true);
  state.draft.value = 'next'; resolve(); await pending;
  assert.equal(state.draft.value, 'next'); assert.equal(jumps, 1); assert.equal(state.isSending.value, false);
  const next = state.sendMessage(); resolve(); await next; assert.equal(state.draft.value, '');
});

test('failed sending preserves draft for retry', async () => {
  let failed = true; const errors = [];
  const state = useChatComposer(ref(false), async () => { if (failed) throw new Error('offline'); }, (error) => errors.push(error), async () => {});
  state.draft.value = '안녕하세요'; await state.sendMessage();
  assert.equal(state.draft.value, '안녕하세요'); assert.equal(state.isSending.value, false); assert.equal(errors.length, 1);
  failed = false; await state.sendMessage(); assert.equal(state.draft.value, '');
});

test('viewport follows keyboard resize, ignores pinch zoom and detaches listeners', () => {
  const target = Object.assign(new EventTarget(), { innerHeight: 800 });
  const viewport = Object.assign(new EventTarget(), { height: 700, scale: 1 });
  target.visualViewport = viewport; const heights = [];
  const stop = observeViewportHeight(target, (height) => heights.push(height));
  viewport.height = 350; viewport.dispatchEvent(new Event('resize'));
  viewport.scale = 2; viewport.dispatchEvent(new Event('resize'));
  assert.deepEqual(heights, ['700px', '350px', '800px']);
  stop(); target.dispatchEvent(new Event('resize')); viewport.dispatchEvent(new Event('resize'));
  assert.equal(heights.length, 3);
});

test('viewport falls back to window height without VisualViewport', () => {
  const target = Object.assign(new EventTarget(), { innerHeight: 600, visualViewport: null });
  const heights = []; const stop = observeViewportHeight(target, (height) => heights.push(height));
  target.innerHeight = 400; target.dispatchEvent(new Event('resize')); stop();
  assert.deepEqual(heights, ['600px', '400px']);
});
