<script setup lang="ts">
import useConfirm from '~/composables/useConfirm';

const { id } = useRoute().params as { id: string };
const router = useRouter();
const { team, getTeamInfo, leaveTeam, joinTeam } = useRoom();

const { openConfirm } = useConfirm();

onMounted(async () => {
  await getTeamInfo(id);
  await joinTeam(id);
});

onUnmounted(async () => {
  await leaveTeam(id);
});

const handleLeaveTeam = () => {
  openConfirm('팀 나가기', '팀을 나가시겠습니까?', () => {
    router.back();
  });
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
