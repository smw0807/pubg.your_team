<script setup lang="ts">
import RoomMemberItem from '~/components/Room/MemberItem.vue';
import type { Platform } from '~/models/common';
import { roomErrorMessage } from '~/services/room';

definePageMeta({ key: (route) => route.path });

const { id } = useRoute().params as { id: string };

useHead({
  title: '팀 채팅방 - PUBG 팀 매칭',
  meta: [
    {
      name: 'description',
      content: 'PUBG 팀원들과 실시간 채팅하고 소통하세요. 닉네임 복사, 전적 조회 기능 제공.',
    },
    { name: 'robots', content: 'noindex, nofollow' },
  ],
});

const router = useRouter();
const { user } = useAuth();
const { team, teamMembers, chatMessages, hasOlderMessages, isLoadingOlder, historyError, historyNotice, chatFromCache, loadOlderMessages, phase, errorMessage, connectionError, isOffline, leaveTeam, joinTeam, retryConnection, sendChatMessage } = useChat();
const { openConfirm } = useConfirm();
const { openAlert } = useAlert();

onMounted(() => { void joinTeam(id); });
const viewportHeight = useViewportHeight();
const membersOpen = ref(false);

// Vue does not await async unmount hooks. Guard navigation instead, so the
// destination list cannot load the membership that is about to be removed.
const beforeLeave = async () => {
  try { await leaveTeam(); return true; }
  catch (error) { errorMessage.value = roomErrorMessage(error); return false; }
};
onBeforeRouteLeave(beforeLeave);
onBeforeRouteUpdate((to, from) => to.params.id === from.params.id ? true : beforeLeave());

const lastPlatform = ref<Platform>('steam');
watch(() => team.value?.platform, (platform) => {
  if (platform === 'steam' || platform === 'kakao') lastPlatform.value = platform;
});
const teamListPath = computed(() => `/teams/${lastPlatform.value}`);
const leaveAndNavigate = async () => {
  const target = teamListPath.value;
  await leaveTeam();
  await router.replace(target);
};

const handleLeaveTeam = () => {
  openConfirm('팀 나가기', '팀을 나가시겠습니까?', leaveAndNavigate);
};

const handleCopyNickname = async (nickname: string) => {
  try {
    await navigator.clipboard.writeText(nickname);
    openAlert('닉네임이 복사되었습니다.');
  } catch { openAlert('복사 실패', '닉네임을 길게 눌러 직접 복사해주세요.'); }
};
</script>

<template>
  <div class="room-layout mx-auto flex min-h-0 flex-col gap-3 py-2 sm:py-4" :style="{ '--room-viewport-height': viewportHeight }">
    <div v-if="phase === 'idle' || phase === 'joining'" role="status" class="py-8 text-center">
      로그인 상태를 확인하고 팀에 입장하는 중입니다...
    </div>
    <div v-if="errorMessage || connectionError || isOffline" role="alert" class="max-h-[25%] shrink-0 overflow-y-auto rounded-lg border border-orange-400 p-3 space-y-2">
      <p>{{ isOffline ? '인터넷 연결이 끊겼습니다. 연결이 돌아오면 다시 연결합니다.' : errorMessage || connectionError }}</p>
      <div class="flex flex-wrap gap-2">
        <UButton v-if="phase === 'error'" :disabled="isOffline" @click="joinTeam(id)">입장 다시 시도</UButton>
        <UButton v-if="phase === 'joined' && connectionError" :disabled="isOffline" @click="retryConnection">다시 연결</UButton>
        <UButton v-if="phase === 'leave-error'" :disabled="isOffline" @click="handleLeaveTeam">퇴장 다시 시도</UButton>
        <UButton v-if="phase === 'error' || phase === 'ended'" :to="teamListPath" variant="outline">팀 목록으로</UButton>
      </div>
    </div>
    <template v-if="team && (phase === 'joined' || phase === 'leaving' || phase === 'leave-error')">
      <div class="flex max-h-[25%] shrink-0 items-start justify-between gap-3 overflow-y-auto">
        <div class="flex min-w-0 flex-col gap-1 [overflow-wrap:anywhere]">
          <h1 class="text-lg sm:text-2xl font-bold">{{ team?.title }}</h1>
          <span class="text-sm text-gray-400 whitespace-pre-wrap">{{ team?.description }}</span>
        </div>
        <UButton color="error" variant="outline" class="min-h-11 shrink-0" :loading="phase === 'leaving'" :disabled="phase === 'leaving'" @click="handleLeaveTeam">
          팀 나가기
        </UButton>
      </div>

      <div class="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-6">
        <!-- 접속자 섹션 -->
        <aside aria-label="팀 접속자" class="max-h-[35%] shrink-0 overflow-y-auto lg:max-h-full lg:w-80">
          <div class="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <h2 class="text-lg font-bold text-white">접속자</h2>
              <span class="text-sm text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full">
                {{ teamMembers.length }}명
              </span>
              <UButton class="ml-auto min-h-11 lg:hidden" variant="ghost" :aria-expanded="membersOpen" aria-controls="room-members" @click="membersOpen = !membersOpen">{{ membersOpen ? '접속자 접기' : '접속자 펼치기' }}</UButton>
            </div>
            <div id="room-members" class="mt-3 space-y-3 lg:block" :class="{ hidden: !membersOpen }">
              <RoomMemberItem
                v-for="member in teamMembers"
                :key="member.id"
                :member="member"
                :platform="team?.platform as Platform"
                @copy="handleCopyNickname"
              />
            </div>
          </div>
        </aside>

        <!-- 채팅 섹션 -->
        <ChatPanel class="min-h-0 flex-1" :messages="chatMessages" :user="user" :disabled="isOffline || phase !== 'joined'" :send="sendChatMessage" :has-older="hasOlderMessages" :loading-older="isLoadingOlder" :history-error="historyError" :history-notice="historyNotice" :history-disabled="isOffline || chatFromCache || phase !== 'joined'" :load-older="loadOlderMessages" @error="openAlert('메시지 전송 실패', roomErrorMessage($event))" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.room-layout {
  height: calc(var(--room-viewport-height, 100dvh) - var(--ui-header-height));
}
</style>
