<script setup lang="ts">
import type { User } from 'firebase/auth';
import type { ChatMessage } from '~/models/chat';
import { handleChatEnter } from '~/utils/chatInteraction';

const { messages, user, disabled = false, send } = defineProps<{
  messages: ChatMessage[];
  user: User | null;
  disabled?: boolean;
  send: (message: string) => Promise<void>;
}>();
const emit = defineEmits<{ error: [error: unknown] }>();
const container = ref<HTMLElement>();
const { followingLatest, hasNewMessages, updatePosition, scrollToLatest } = useChatScroll(container, computed(() => messages.length));
const { draft, isSending, sendMessage } = useChatComposer(computed(() => disabled), (message) => send(message), (error) => emit('error', error), scrollToLatest);
let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(() => { if (followingLatest.value) void scrollToLatest(); });
  if (container.value) observer.observe(container.value);
});
onScopeDispose(() => observer?.disconnect());

const handleEnter = (event: KeyboardEvent) => {
  handleChatEnter(event, () => { void sendMessage(); });
};
</script>

<template>
  <section aria-label="팀 채팅" class="flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-gray-700/50 bg-gray-800/50">
    <div ref="container" role="region" aria-label="채팅 메시지" tabindex="0" class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 focus-visible:outline-2 focus-visible:outline-blue-400" @scroll="updatePosition">
      <p v-if="!messages.length" class="py-4 text-center text-sm text-gray-400">첫 메시지를 보내 팀원들과 인사해보세요.</p>
      <div v-for="message in messages" :key="message.id" class="mb-4 flex min-w-0" :class="message.uid === user?.uid ? 'justify-end' : 'justify-start'">
        <ChatMessage :message="message" :user="user" />
      </div>
    </div>
    <div v-if="hasNewMessages" role="status" class="shrink-0 px-3 pb-2">
      <UButton class="min-h-11 w-full justify-center" variant="soft" @click="scrollToLatest">새 메시지 · 아래로 이동</UButton>
    </div>
    <form aria-label="채팅 메시지 전송" class="flex shrink-0 gap-2 border-t border-gray-700/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4" @submit.prevent="sendMessage">
      <UInput v-model="draft" aria-label="채팅 메시지 입력" :maxlength="2000" :disabled="disabled" placeholder="메시지를 입력하세요..." enterkeyhint="send" autocomplete="off" class="min-w-0 flex-1" :ui="{ base: 'min-h-11 text-base' }" @keydown.enter="handleEnter" />
      <UButton type="submit" aria-label="메시지 전송" class="min-h-11 min-w-11 shrink-0 justify-center" icon="i-heroicons-paper-airplane" :loading="isSending" :disabled="disabled || isSending || !draft.trim()">
        <span class="hidden sm:inline">전송</span>
      </UButton>
    </form>
  </section>
</template>
