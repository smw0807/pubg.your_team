<script setup lang="ts">
import { mockTeams } from '~/assets/mock/temas';

// const { platform } = useRoute().params;

const handleClick = (id: number) => {
  console.log(id);
};
</script>
<template>
  <div class="container mx-auto px-4 py-8">
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
