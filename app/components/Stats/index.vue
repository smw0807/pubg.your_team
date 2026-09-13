<script setup lang="ts">
import type { ModeStat } from '~/models/profile';
import { modeTextTransform } from '~/utils/textTransform';
import { averageDamage, formatStat } from '~/utils/statsFormat';

const { stat, mode, perspective = 'TPP' } = defineProps<{
  stat: ModeStat;
  mode: 'duo' | 'squad';
  perspective?: 'TPP' | 'FPP';
}>();

const metrics = computed(() => [
  { label: '총 게임 수', value: formatStat(stat.roundsPlayed) },
  { label: '승리', value: formatStat(stat.wins) },
  { label: '승률', value: stat.winRatio === null ? '—' : `${formatStat(stat.winRatio * 100, 1)}%` },
  { label: '평균 순위', value: formatStat(stat.avgRank, 1) },
  { label: 'K/D', value: formatStat(stat.kdr, 2) },
  { label: '평균 딜량', value: formatStat(averageDamage(stat.damageDealt, stat.roundsPlayed)) },
  { label: '킬', value: formatStat(stat.kills) },
  { label: '데스', value: formatStat(stat.deaths) },
  { label: '어시스트', value: formatStat(stat.assists) },
  { label: '총 데미지', value: formatStat(stat.damageDealt) },
  { label: '다운', value: formatStat(stat.dBNOs) },
  { label: '팀킬', value: formatStat(stat.teamKills) },
]);
</script>

<template>
  <h3 class="text-lg font-semibold text-blue-400">{{ modeTextTransform(mode) }} · {{ perspective }} 경쟁전</h3>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div v-for="entry in [{ label: '현재 티어', tier: stat.currentTier, points: stat.currentRankPoint }, { label: '최고 티어', tier: stat.bestTier, points: stat.bestRankPoint }]" :key="entry.label" class="bg-gray-800 border border-gray-700 p-4 rounded-lg">
      <h4 class="text-sm text-gray-300 mb-2">{{ entry.label }}</h4>
      <p class="text-xl font-bold">{{ entry.tier.tier }} <span v-if="entry.tier.subTier !== '-'" class="text-sm text-gray-400">{{ entry.tier.subTier }}단계</span></p>
      <p class="text-sm text-gray-400 mt-1">{{ formatStat(entry.points) }} RP</p>
    </div>
  </div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div v-for="metric in metrics" :key="metric.label" class="bg-gray-800 border border-gray-700 p-3 rounded-lg text-center">
      <div class="break-all text-lg sm:text-xl font-bold text-blue-400">{{ metric.value }}</div>
      <div class="text-xs text-gray-400 mt-1">{{ metric.label }}</div>
    </div>
  </div>
</template>
