import { nextTick, ref, watch, type Ref } from 'vue';
import { isNearChatBottom } from '../utils/chatInteraction.ts';

export default function useChatScroll(element: Readonly<Ref<HTMLElement | undefined>>, messageCount: Readonly<Ref<number>>) {
  const followingLatest = ref(true);
  const hasNewMessages = ref(false);
  const updatePosition = () => {
    if (!element.value) return;
    followingLatest.value = isNearChatBottom(element.value);
    if (followingLatest.value) hasNewMessages.value = false;
  };
  const scrollToLatest = async () => {
    followingLatest.value = true;
    hasNewMessages.value = false;
    await nextTick();
    if (element.value) element.value.scrollTop = element.value.scrollHeight;
  };
  watch(messageCount, (count, previous) => {
    if (followingLatest.value || previous === 0) void scrollToLatest();
    else if (count > previous) hasNewMessages.value = true;
  }, { flush: 'post' });
  watch(element, () => { if (followingLatest.value) void scrollToLatest(); }, { flush: 'post' });
  return { followingLatest, hasNewMessages, updatePosition, scrollToLatest };
}
