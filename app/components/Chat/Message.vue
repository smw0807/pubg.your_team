<script setup lang="ts">
import type { User } from 'firebase/auth';
import type { ChatMessage } from '~/models/chat';

const { message, user } = defineProps<{
  message: ChatMessage;
  user: User | null;
}>();
</script>

<template>
  <div
    class="max-w-xs lg:max-w-md relative group"
    :class="
      message.uid === user?.uid
        ? 'flex flex-col items-end'
        : 'flex flex-col items-start'
    "
  >
    <!-- 메시지 박스 -->
    <div
      class="relative px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl"
      :class="
        message.uid === user?.uid
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
          : 'bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-bl-md'
      "
    >
      <!-- 메시지 내용 -->
      <div class="text-sm font-medium leading-relaxed">
        {{ message.message }}
      </div>

      <!-- 시간 -->
      <div
        class="text-xs mt-2 opacity-75"
        :class="message.uid === user?.uid ? 'text-right' : 'text-left'"
      >
        {{ message.createdAt }}
      </div>

      <!-- 말풍선 꼬리 -->
      <div
        v-if="message.uid === user?.uid"
        class="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 transform rotate-45"
      />
      <div
        v-else
        class="absolute -bottom-1 -left-1 w-3 h-3 bg-gray-700 transform rotate-45"
      />
    </div>

    <!-- 발신자 이름 -->
    <div
      class="text-xs text-gray-400 mt-1 px-2"
      :class="message.uid === user?.uid ? 'text-right' : 'text-left'"
    >
      {{ message.uid === user?.uid ? '나' : message.sender }}
    </div>
  </div>
</template>
