<script setup lang="ts">
import type { Stat } from '~/models/profile';

const { platform, nickname } = defineProps<{
  platform: string;
  nickname: string;
}>();

const stats = ref<Stat | null>(null);
const isLoading = ref(false);

const handleCheckStat = async () => {
  isLoading.value = true;
  try {
    const response = await pubgApi(
      `/stats/rank?platform=${platform}&playerName=${nickname}`
    );
    stats.value = response as Stat;
  } catch (error) {
    console.error('스탯 조회 실패:', error);
  } finally {
    isLoading.value = false;
  }
};

const handleCheckRecentMatch = async () => {
  const config = useRuntimeConfig();
  const matchUrl = config.public.matchUrl as string;
  window.open(`${matchUrl}/player/${platform}/${nickname}`, '_blank');
};

const banTypeTransform = (banType: string) => {
  switch (banType) {
    case 'Innocent':
      return '정상';
    case 'TemporaryBan':
      return '임시정지';
    case 'PermanentBan':
      return '영구정지';
    default:
      return '정상';
  }
};

const getBanTypeColor = (banType: string) => {
  switch (banType) {
    case 'Innocent':
      return {
        icon: 'text-green-500',
        text: 'text-green-600',
      };
    case 'TemporaryBan':
      return {
        icon: 'text-orange-500',
        text: 'text-orange-600',
      };
    case 'PermanentBan':
      return {
        icon: 'text-red-500',
        text: 'text-red-600',
      };
    default:
      return {
        icon: 'text-green-500',
        text: 'text-green-600',
      };
  }
};
</script>

<template>
  <UModal title="스탯 확인" description="현재 스탯을 확인할 수 있습니다.">
    <UTooltip text="스탯 확인">
      <UButton
        color="info"
        variant="ghost"
        :loading="isLoading"
        :disabled="isLoading"
        @click="handleCheckStat"
      >
        <UIcon name="i-heroicons-magnifying-glass" class="w-6 h-6" />
      </UButton>
    </UTooltip>

    <template #body>
      <div class="flex flex-col gap-6">
        <!-- 플레이어 정보 -->
        <div class="flex flex-col gap-2">
          <span class="text-sm text-gray-500">
            {{ platformTextTransform(platform) }} 닉네임
          </span>
          <div class="flex items-center gap-3">
            <span class="text-lg font-bold">{{ nickname }}</span>
            <!-- 밴 상태 -->
            <div v-if="stats?.banType" class="flex items-center gap-1">
              <UIcon
                :name="
                  stats.banType === 'Innocent'
                    ? 'i-heroicons-shield-check'
                    : 'i-heroicons-exclamation-triangle'
                "
                :class="getBanTypeColor(stats.banType).icon"
                class="w-4 h-4"
              />
              <span
                class="text-sm font-medium"
                :class="getBanTypeColor(stats.banType).text"
              >
                {{ banTypeTransform(stats.banType) }}
              </span>
            </div>
            <UButton
              color="info"
              variant="outline"
              @click="handleCheckRecentMatch"
              >최근매치보기</UButton
            >
          </div>
        </div>

        <!-- 스탯 데이터가 있을 때만 표시 -->
        <div v-if="stats" class="space-y-6">
          <!-- 스쿼드 스탯 -->
          <div v-if="stats.squad" class="space-y-4">
            <Stats :stat="stats.squad" />
          </div>

          <!-- 듀오 스탯 (있는 경우) -->
          <div v-if="stats.duo" class="space-y-4">
            <Stats :stat="stats.duo" />
          </div>
        </div>

        <!-- 로딩 상태 -->
        <div v-if="isLoading" class="flex justify-center items-center py-8">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-6 h-6 animate-spin text-blue-500"
          />
          <span class="ml-2 text-gray-600">스탯을 불러오는 중...</span>
        </div>

        <!-- 스탯이 없을 때 -->
        <div v-if="!stats && !isLoading" class="text-center py-8 text-gray-500">
          <UIcon
            name="i-heroicons-chart-bar"
            class="w-12 h-12 mx-auto mb-2 opacity-50"
          />
          <p>현재 시즌 스탯이 없습니다.</p>
        </div>
      </div>
    </template>
  </UModal>
</template>
