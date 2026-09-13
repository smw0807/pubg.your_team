import { nextTick, ref, watch, type Ref } from 'vue';
import { isNearChatBottom } from '../utils/chatInteraction.ts';

export default function useChatScroll(element: Readonly<Ref<HTMLElement | undefined>>, messageCount: Readonly<Ref<number>>, latestMessageId?: Readonly<Ref<string | undefined>>) {
  const followingLatest = ref(true);
  const hasNewMessages = ref(false);
  const preservingPosition = ref(false);
  const updatePosition = () => {
    if (!element.value || preservingPosition.value) return;
    followingLatest.value = isNearChatBottom(element.value);
    if (followingLatest.value) hasNewMessages.value = false;
  };
  const scrollToLatest = async () => {
    followingLatest.value = true;
    hasNewMessages.value = false;
    await nextTick();
    if (element.value) element.value.scrollTop = element.value.scrollHeight;
  };
  const preservePosition = async (load: () => Promise<void>) => {
    const container = element.value;
    if (!container || preservingPosition.value) return;
    const top = container.getBoundingClientRect().top;
    const anchor = [...container.querySelectorAll<HTMLElement>('[data-chat-id]')].find((row) => row.getBoundingClientRect().bottom > top);
    const offset = anchor?.getBoundingClientRect().top;
    preservingPosition.value = true;
    try {
      await load();
      await nextTick();
      if (anchor?.isConnected && offset !== undefined) container.scrollTop += anchor.getBoundingClientRect().top - offset;
    } finally {
      preservingPosition.value = false;
      updatePosition();
    }
  };
  watch([messageCount, () => latestMessageId?.value], ([count, latest], [previous, previousLatest]) => {
    if (preservingPosition.value) return;
    if (followingLatest.value || previous === 0) void scrollToLatest();
    else if (count > previous || latest !== previousLatest) hasNewMessages.value = true;
  }, { flush: 'post' });
  watch(element, () => { if (followingLatest.value) void scrollToLatest(); }, { flush: 'post' });
  return { followingLatest, hasNewMessages, preservingPosition, preservePosition, updatePosition, scrollToLatest };
}
