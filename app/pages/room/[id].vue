<script setup lang="ts">
import ChatMessage from '~/components/Chat/Message.vue';
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
const { team, teamMembers, chatMessages, phase, errorMessage, connectionError, isOffline, leaveTeam, joinTeam, retryConnection, sendChatMessage } = useChat();
const { openConfirm } = useConfirm();
const { openAlert } = useAlert();

onMounted(async () => {
  const joined = await joinTeam(id);
  if (!joined) return;

  scrollToBottom();
});

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

const handleCopyNickname = (nickname: string) => {
  navigator.clipboard.writeText(nickname);
  openAlert('닉네임이 복사되었습니다.');
};

const newMessage = ref('');
const isSending = ref(false);
const chatContainer = ref<HTMLElement>();

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

const sendMessage = async () => {
  if (isSending.value || !newMessage.value.trim()) return;
  isSending.value = true;
  const submitted = newMessage.value;
  try {
    await sendChatMessage(submitted);
    scrollToBottom();
    if (newMessage.value === submitted) newMessage.value = '';
  } catch (error) {
    openAlert('메시지 전송 실패', roomErrorMessage(error));
  } finally {
    isSending.value = false;
  }
};

watch(chatMessages, scrollToBottom);
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="phase === 'idle' || phase === 'joining'" role="status" class="py-8 text-center">
      로그인 상태를 확인하고 팀에 입장하는 중입니다...
    </div>
    <div v-if="errorMessage || connectionError || isOffline" role="alert" class="mb-6 rounded-lg border border-orange-400 p-4 space-y-3">
      <p>{{ isOffline ? '인터넷 연결이 끊겼습니다. 연결이 돌아오면 다시 연결합니다.' : errorMessage || connectionError }}</p>
      <div class="flex gap-2">
        <UButton v-if="phase === 'error'" :disabled="isOffline" @click="joinTeam(id)">입장 다시 시도</UButton>
        <UButton v-if="phase === 'joined' && connectionError" :disabled="isOffline" @click="retryConnection">다시 연결</UButton>
        <UButton v-if="phase === 'leave-error'" :disabled="isOffline" @click="handleLeaveTeam">퇴장 다시 시도</UButton>
        <UButton v-if="phase === 'error' || phase === 'ended'" :to="teamListPath" variant="outline">팀 목록으로</UButton>
      </div>
    </div>
    <template v-if="team && (phase === 'joined' || phase === 'leaving' || phase === 'leave-error')">
      <div class="flex items-center justify-between mb-10">
        <div class="flex flex-col items-center gap-2">
          <h1 class="text-2xl font-bold">{{ team?.title }}</h1>
          <span class="text-sm text-gray-400">{{ team?.description }}</span>
        </div>
        <UButton color="error" variant="outline" :loading="phase === 'leaving'" :disabled="phase === 'leaving'" size="xl" @click="handleLeaveTeam">
          팀 나가기
        </UButton>
      </div>

      <div class="flex gap-8">
        <!-- 접속자 섹션 -->
        <div class="w-1/4">
          <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <h2 class="text-lg font-bold text-white">접속자</h2>
              <span class="text-sm text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full">
                {{ teamMembers.length }}명
              </span>
            </div>
            <div class="space-y-3">
              <RoomMemberItem
                v-for="member in teamMembers"
                :key="member.id"
                :member="member"
                :platform="team?.platform as Platform"
                @copy="handleCopyNickname"
              />
            </div>
          </div>
        </div>

        <!-- 채팅 섹션 -->
        <div class="w-3/4">
          <div class="bg-gray-800/50 rounded-xl border border-gray-700/50 h-[680px] flex flex-col">
            <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
              <div
                v-for="message in chatMessages"
                :key="message.id"
                class="flex mb-4"
                :class="message.uid === user?.uid ? 'justify-end' : 'justify-start'"
              >
                <ChatMessage :message="message" :user="user" />
              </div>
            </div>

            <div class="p-4 border-t border-gray-700/50">
              <div class="flex gap-3">
                <UInput
                  v-model="newMessage"
                  :maxlength="2000"
                  placeholder="메시지를 입력하세요..."
                  class="flex-1"
                  size="lg"
                  @keyup.enter="sendMessage"
                />
                <UButton
                  color="primary"
                  size="lg"
                  icon="i-heroicons-paper-airplane"
                  :loading="isSending"
                  :disabled="isSending || !newMessage.trim() || isOffline || phase !== 'joined'"
                  @click="sendMessage"
                >
                  전송
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
