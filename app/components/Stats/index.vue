<script setup lang="ts">
import type { ModeStat } from '~/models/profile';
import { modeTextTransform } from '~/utils/textTransform';

const { stat } = defineProps<{
  stat: ModeStat;
}>();

// 스탯 포맷팅 함수들
const formatRatio = (ratio: number) => {
  return (ratio * 100).toFixed(1) + '%';
};

const formatNumber = (num: number) => {
  return num.toLocaleString();
};

const getTierColor = (tier: string) => {
  const colors: Record<string, string> = {
    Bronze: 'text-amber-600',
    Silver: 'text-gray-500',
    Gold: 'text-yellow-500',
    Platinum: 'text-blue-500',
    Diamond: 'text-cyan-500',
    Master: 'text-purple-500',
    Survivor: 'text-green-500',
    Conqueror: 'text-red-500',
  };
  return colors[tier] || 'text-gray-700';
};

const averageDamage = computed(() =>
  Math.round(stat.damageDealt / stat.roundsPlayed)
);
</script>

<template>
  <h3 class="text-lg font-semibold text-blue-600 flex items-center gap-2">
    <UIcon name="i-heroicons-users" class="w-5 h-5" />
    {{ modeTextTransform('squad') }} 모드
  </h3>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- 현재 티어 -->
    <div class="bg-gray-800 border border-gray-700 p-4 rounded-lg">
      <h4 class="text-sm font-medium text-gray-300 mb-2">현재 티어</h4>
      <div class="flex items-center gap-2">
        <span
          :class="getTierColor(stat.currentTier.tier)"
          class="text-xl font-bold"
        >
          {{ stat.currentTier.tier }}
        </span>
        <span class="text-sm text-gray-400">
          {{ stat.currentTier.subTier }}단계
        </span>
      </div>
      <div class="text-sm text-gray-500 mt-1">
        {{ formatNumber(stat.currentRankPoint) }} RP
      </div>
    </div>

    <!-- 최고 티어 -->
    <div class="bg-gray-800 border border-gray-700 p-4 rounded-lg">
      <h4 class="text-sm font-medium text-gray-300 mb-2">최고 티어</h4>
      <div class="flex items-center gap-2">
        <span
          :class="getTierColor(stat.bestTier.tier)"
          class="text-xl font-bold"
        >
          {{ stat.bestTier.tier }}
        </span>
        <span class="text-sm text-gray-400">
          {{ stat.bestTier.subTier }}단계
        </span>
      </div>
      <div class="text-sm text-gray-500 mt-1">
        {{ formatNumber(stat.bestRankPoint) }} RP
      </div>
    </div>
  </div>

  <!-- 게임 통계 -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div
      class="bg-blue-900/30 border border-blue-700/50 p-3 rounded-lg text-center"
    >
      <div class="text-2xl font-bold text-blue-400">
        {{ stat.roundsPlayed }}
      </div>
      <div class="text-xs text-gray-400">총 게임 수</div>
    </div>
    <div
      class="bg-green-900/30 border border-green-700/50 p-3 rounded-lg text-center"
    >
      <div class="text-2xl font-bold text-green-400">
        {{ stat.wins }}
      </div>
      <div class="text-xs text-gray-400">승리</div>
    </div>
    <div
      class="bg-yellow-900/30 border border-yellow-700/50 p-3 rounded-lg text-center"
    >
      <div class="text-2xl font-bold text-yellow-400">
        {{ formatRatio(stat.winRatio) }}
      </div>
      <div class="text-xs text-gray-400">승률</div>
    </div>
    <div
      class="bg-purple-900/30 border border-purple-700/50 p-3 rounded-lg text-center"
    >
      <div class="text-2xl font-bold text-purple-400">
        {{ stat.avgRank.toFixed(1) }}
      </div>
      <div class="text-xs text-gray-400">평균 순위</div>
    </div>
  </div>

  <!-- 전투 통계 -->
  <div class="space-y-3">
    <h4 class="text-md font-semibold text-gray-500">전투 통계</h4>
    <div class="grid grid-cols-2 md:grid-cols-2 gap-3">
      <div
        class="bg-orange-900/30 border border-orange-700/50 p-3 rounded-lg text-center"
      >
        <div class="text-xl font-bold text-orange-400">
          {{ stat.kda.toFixed(2) }}
        </div>
        <div class="text-xs text-gray-400">KDA</div>
      </div>
      <div
        class="bg-orange-900/30 border border-orange-700/50 p-3 rounded-lg text-center"
      >
        <div class="text-xl font-bold text-orange-400">
          {{ averageDamage }}
        </div>
        <div class="text-xs text-gray-400">평균딜량</div>
      </div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div
        class="bg-red-900/30 border border-red-700/50 p-3 rounded-lg text-center"
      >
        <div class="text-xl font-bold text-red-400">
          {{ stat.kills }}
        </div>
        <div class="text-xs text-gray-400">킬</div>
      </div>
      <div
        class="bg-gray-800 border border-gray-700 p-3 rounded-lg text-center"
      >
        <div class="text-xl font-bold text-gray-300">
          {{ stat.deaths }}
        </div>
        <div class="text-xs text-gray-400">데스</div>
      </div>

      <div
        class="bg-indigo-900/30 border border-indigo-700/50 p-3 rounded-lg text-center"
      >
        <div class="text-xl font-bold text-indigo-400">
          {{ stat.assists }}
        </div>
        <div class="text-xs text-gray-400">어시스트</div>
      </div>
      <div
        class="bg-blue-900/30 border border-blue-700/50 p-4 rounded-lg text-center"
      >
        <div class="text-2xl font-bold text-blue-400">
          {{ formatNumber(Math.round(stat.damageDealt)) }}
        </div>
        <div class="text-xs text-gray-400">총 데미지</div>
      </div>
    </div>
  </div>

  <!-- 기타 통계 -->
  <div class="space-y-3">
    <h4 class="text-md font-semibold text-gray-500">기타 통계</h4>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div
        class="bg-purple-900/30 border border-purple-700/50 p-4 rounded-lg text-center"
      >
        <div class="text-2xl font-bold text-purple-400">
          {{ stat.dBNOs }}
        </div>
        <div class="text-xs text-gray-400">다운</div>
      </div>
      <div
        class="bg-gray-800 border border-gray-700 p-4 rounded-lg text-center"
      >
        <div class="text-2xl font-bold text-gray-300">
          {{ stat.teamKills }}
        </div>
        <div class="text-xs text-gray-400">팀킬</div>
      </div>
    </div>
  </div>
</template>
