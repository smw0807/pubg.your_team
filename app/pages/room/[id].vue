<script setup lang="ts">
import type { Team } from '~/models/team';

const { id } = useRoute().params as { id: string };
const { getTeam } = useRoom();

const team = ref<Team | null>(null);

onMounted(async () => {
  team.value = await getTeam(id);
  console.log(team.value);
});

onUnmounted(() => {
  // 팀 나가기 버튼 클릭 시 팀 나가기 로직 추가 필요
  console.log('팀 나가기');
});

const handleLeaveTeam = () => {
  console.log('팀 나가기');
};
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-10">
      <div class="flex flex-col items-center gap-2">
        <h1 class="text-2xl font-bold">{{ team?.title }}</h1>
        <span class="text-sm text-gray-400">{{ team?.description }}</span>
      </div>

      <UBadge
        color="error"
        variant="outline"
        class="cursor-pointer"
        size="xl"
        @click="handleLeaveTeam"
        >팀 나가기</UBadge
      >
    </div>
    <!-- 왼쪽은 접속자 / 오른쪽은 채팅 -->
    <div class="flex items-center justify-between">
      <div class="w-1/4">
        <h2 class="text-lg font-bold">접속자</h2>
      </div>
      <div class="w-3/4">
        <h2 class="text-lg font-bold">채팅</h2>
      </div>
    </div>
  </div>
</template>
