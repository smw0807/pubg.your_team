<script setup lang="ts">
import UserStat from '~/components/Modal/UserStat.vue';
import useConfirm from '~/composables/useConfirm';
import type { Platform } from '~/models/common';

const { id } = useRoute().params as { id: string };
const router = useRouter();
const { team, teamMembers, getTeamInfo, leaveTeam, joinTeam } = useRoom();

const { openConfirm } = useConfirm();
const { openAlert } = useAlert();

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

const handleCopyNickname = (nickname: string) => {
  navigator.clipboard.writeText(nickname);
  openAlert('닉네임이 복사되었습니다.');
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
                <div class="flex items-center gap-3">
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
      <div class="w-3/4">
        <h2 class="text-lg font-bold">채팅</h2>
      </div>
    </div>
  </div>
</template>
