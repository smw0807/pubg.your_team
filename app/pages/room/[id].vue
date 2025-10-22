<script setup lang="ts">
import UserStat from '~/components/Modal/UserStat.vue';
import ChatMessage from '~/components/Chat/Message.vue';
import useConfirm from '~/composables/useConfirm';
import type { Platform } from '~/models/common';

const { id } = useRoute().params as { id: string };
const router = useRouter();
const { user } = useAuth();
const {
  team,
  teamMembers,
  chatMessages,
  getTeamInfo,
  leaveTeam,
  joinTeam,
  sendChatMessage,
} = useChat();

const { openConfirm } = useConfirm();
const { openAlert } = useAlert();

onMounted(async () => {
  await getTeamInfo(id);
  await joinTeam(id);
  scrollToBottom();
});

onUnmounted(async () => {
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

// 채팅 메시지가 변경될 때마다 자동 스크롤
watch(
  chatMessages,
  () => {
    scrollToBottom();
  },
  { deep: true }
);
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
    <div class="flex gap-8">
      <!-- 접속자 섹션 -->
      <div class="w-1/4">
        <div class="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h2 class="text-lg font-bold text-white">접속자</h2>
            <span
              class="text-sm text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full"
            >
              {{ teamMembers.length }}명
            </span>
          </div>

          <div class="space-y-3">
            <div
              v-for="member in teamMembers"
              :key="member.id"
              class="group bg-gray-700/30 hover:bg-gray-700/50 rounded-lg p-4 transition-all duration-200 border border-gray-600/30 hover:border-gray-500/50"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <!-- 사용자 아바타 -->
                  <div
                    class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  >
                    {{
                      (team?.platform === 'kakao'
                        ? member.kakaoNickname
                        : member.steamNickname
                      )
                        ?.charAt(0)
                        .toUpperCase()
                    }}
                  </div>

                  <!-- 닉네임 -->
                  <div class="flex flex-col">
                    <span class="text-white font-medium">
                      {{
                        team?.platform === 'kakao'
                          ? member.kakaoNickname
                          : member.steamNickname
                      }}
                    </span>
                    <span class="text-xs text-gray-400 capitalize">
                      {{ team?.platform }}
                    </span>
                  </div>
                </div>

                <!-- 액션 버튼들 -->
                <div
                  class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <button
                    class="p-3 hover:bg-gray-600/50 rounded-lg transition-colors duration-200"
                    title="닉네임 복사"
                    @click="
                      handleCopyNickname(
                        team?.platform === 'kakao'
                          ? (member.kakaoNickname as string)
                          : (member.steamNickname as string)
                      )
                    "
                  >
                    <UIcon
                      name="i-heroicons-clipboard-document"
                      class="w-5 h-5 text-gray-400 hover:text-white"
                    />
                  </button>

                  <UserStat
                    v-if="team?.platform === 'kakao'"
                    :platform="team?.platform as Platform"
                    :nickname="member.kakaoNickname as string"
                  />
                  <UserStat
                    v-if="team?.platform === 'steam'"
                    :platform="team?.platform as Platform"
                    :nickname="member.steamNickname as string"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 채팅 섹션 -->
      <div class="w-3/4">
        <div
          class="bg-gray-800/50 rounded-xl border border-gray-700/50 h-[680px] flex flex-col"
        >
          <!-- 채팅 메시지 영역 -->
          <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
            <div
              v-for="(message, idx) in chatMessages"
              :key="idx"
              class="flex mb-4"
              :class="
                message.uid === user?.uid ? 'justify-end' : 'justify-start'
              "
            >
              <ChatMessage :message="message" :user="user" />
            </div>
          </div>

          <!-- 채팅 입력 영역 -->
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
