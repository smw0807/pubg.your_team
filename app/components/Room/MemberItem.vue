<script setup lang="ts">
import type { Profile } from '~/models/profile';
import type { Platform } from '~/models/common';
import UserStat from '~/components/Modal/UserStat.vue';

const { member, platform } = defineProps<{
  member: Profile;
  platform: Platform;
}>();

const emit = defineEmits<{
  copy: [nickname: string];
}>();

const nickname = computed(() =>
  platform === 'kakao' ? member.kakaoNickname : member.steamNickname
);
</script>

<template>
  <div
    class="group bg-gray-700/30 hover:bg-gray-700/50 rounded-lg p-4 transition-all duration-200 border border-gray-600/30 hover:border-gray-500/50"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm"
        >
          {{ nickname?.charAt(0).toUpperCase() }}
        </div>
        <div class="flex flex-col">
          <span class="text-white font-medium">{{ nickname }}</span>
          <span class="text-xs text-gray-400 capitalize">{{ platform }}</span>
        </div>
      </div>

      <div
        class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        <button
          class="p-3 hover:bg-gray-600/50 rounded-lg transition-colors duration-200"
          title="닉네임 복사"
          @click="emit('copy', nickname as string)"
        >
          <UIcon
            name="i-heroicons-clipboard-document"
            class="w-5 h-5 text-gray-400 hover:text-white"
          />
        </button>
        <UserStat :platform="platform" :nickname="nickname as string" />
      </div>
    </div>
  </div>
</template>
