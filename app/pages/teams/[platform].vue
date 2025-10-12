<script setup lang="ts">
import { mockTeams } from '~/assets/mock/temas';
import { platformTextTransform } from '~/utils/textTransform';

const { platform } = useRoute().params as { platform: string };

const handleClick = (id: number) => {
  console.log(id);
};
</script>
<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">
        {{ platformTextTransform(platform) }} 팀 찾기
      </h1>
    </div>

    <div class="flex items-center justify-end gap-4 mb-4">
      <!-- 방 리스트 새로고침 버튼 아이콘 -->
      <UButton color="neutral" size="lg" variant="ghost">
        <UIcon name="i-heroicons-arrow-path-20-solid" class="w-6 h-6" />
      </UButton>
      <!-- 방 만들기 버튼 -->
      <UButton color="primary" size="lg">방 만들기</UButton>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TeamListCard
        v-for="team in mockTeams"
        :key="team.id"
        :team="team"
        @click="handleClick"
      />
    </div>
  </div>
</template>
