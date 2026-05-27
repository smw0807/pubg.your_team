<script setup lang="ts">
import ChatMessage from '~/components/Chat/Message.vue';
import RoomMemberItem from '~/components/Room/MemberItem.vue';
import type { Platform } from '~/models/common';

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
const { team, teamMembers, chatMessages, getTeamInfo, leaveTeam, joinTeam, sendChatMessage, cleanupWatchers } = useChat();
const { openConfirm } = useConfirm();
const { openAlert } = useAlert();

onMounted(async () => {
  await getTeamInfo(id);
  if (!team.value) return;

  const joined = await joinTeam(id);
  if (!joined) return;

  scrollToBottom();
});

onUnmounted(async () => {
  cleanupWatchers();
  await leaveTeam(id);
});

const handleLeaveTeam = () => {
  openConfirm('팀 나가기', '팀을 나가시겠습니까?', () => {
    router.back();
  });
};

const handleCopyNickname = (nickname: string) => {
  navigator.clipboard.writeText(nickname);
  openAlert('닉네임이 복사되었습니다.');
};

const newMessage = ref('');
const chatContainer = ref<HTMLElement>();

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  await sendChatMessage(newMessage.value);
  scrollToBottom();
  newMessage.value = '';
};

watch(chatMessages, scrollToBottom);
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-10">
      <div class="flex flex-col items-center gap-2">
        <h1 class="text-2xl font-bold">{{ team?.title }}</h1>
        <span class="text-sm text-gray-400">{{ team?.description }}</span>
      </div>
      <UBadge color="error" variant="outline" class="cursor-pointer" size="xl" @click="handleLeaveTeam">
        팀 나가기
      </UBadge>
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
              v-for="(message, idx) in chatMessages"
              :key="idx"
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
                placeholder="메시지를 입력하세요..."
                class="flex-1"
                size="lg"
                @keyup.enter="sendMessage"
              />
              <UButton
                color="primary"
                size="lg"
                icon="i-heroicons-paper-airplane"
                :disabled="!newMessage.trim()"
                @click="sendMessage"
              >
                전송
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
