<script setup lang="ts">
import { responsiveModalUi } from '~/constants/modal';
import type { Stat } from '~/models/profile';
import { recentMatchUrl } from '~/utils/statsFormat';

const { platform, nickname } = defineProps<{ platform: string; nickname: string }>();
const isOpen = ref(false);
const target = computed(() => ({ platform, nickname }));
const { stats, isLoading, errorMessage, hasLoaded, load, reset } = usePlayerStats(target, (value, signal) =>
  $fetch<Stat>('/api/stats/rank', { query: { platform: value.platform, playerName: value.nickname }, signal, timeout: 20_000, retry: 0 }),
);
watch(isOpen, (open) => { if (open) void load(); else reset(); });
watch(target, () => { if (isOpen.value) void load(); });

const config = useRuntimeConfig();
const matchUrl = computed(() => recentMatchUrl(String(config.public.matchUrl ?? ''), platform, nickname));
const modes = computed(() => [
  { key: 'squad', mode: 'squad' as const, perspective: 'TPP' as const, stat: stats.value?.squad },
  { key: 'squadFpp', mode: 'squad' as const, perspective: 'FPP' as const, stat: stats.value?.squadFpp },
  { key: 'duo', mode: 'duo' as const, perspective: 'TPP' as const, stat: stats.value?.duo },
  { key: 'duoFpp', mode: 'duo' as const, perspective: 'FPP' as const, stat: stats.value?.duoFpp },
].filter((entry) => entry.stat));
const fetchedAt = computed(() => stats.value?.fetchedAt ? new Date(stats.value.fetchedAt).toLocaleString('ko-KR') : '');
const banLabel = computed(() => ({ Innocent: '정상', TemporaryBan: '임시정지', PermanentBan: '영구정지' })[stats.value?.banType ?? ''] ?? '확인 불가');
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ ...responsiveModalUi, content: 'mobile-dialog sm:max-w-3xl' }" title="경쟁전 전적 확인" description="현재 시즌의 듀오·스쿼드 경쟁전 기록을 표시합니다.">
    <UTooltip text="전적 확인">
      <UButton color="info" variant="ghost" class="min-h-11 min-w-11 shrink-0 justify-center" :aria-label="`${nickname} 전적 확인`" icon="i-heroicons-magnifying-glass" />
    </UTooltip>
    <template #body>
      <div class="flex flex-col gap-6">
        <div class="space-y-2">
          <p class="text-sm text-gray-400">{{ platformTextTransform(platform) }} 닉네임</p>
          <div class="flex flex-wrap items-center gap-3">
            <span class="min-w-0 break-all text-lg font-bold">{{ nickname }}</span>
            <span v-if="stats" class="text-sm">계정 상태: {{ banLabel }}</span>
            <UButton v-if="matchUrl" :to="matchUrl" target="_blank" rel="noopener noreferrer" variant="outline">최근 매치 보기</UButton>
            <span v-else class="text-sm text-gray-400">최근 매치 링크 미설정</span>
          </div>
        </div>
        <p v-if="isLoading" role="status" class="py-8 text-center">전적을 불러오는 중입니다...</p>
        <div v-else-if="errorMessage" role="alert" class="rounded-lg border border-red-400 p-4 space-y-3">
          <p>{{ errorMessage }}</p>
          <UButton variant="outline" @click="load">다시 시도</UButton>
        </div>
        <template v-else-if="hasLoaded">
          <p class="text-sm text-gray-400">조회 시각: {{ fetchedAt }} · 최대 5분간 캐시됩니다.</p>
          <p v-if="!modes.length" role="status" class="py-8 text-center text-gray-400">현재 시즌 듀오·스쿼드 경쟁전 기록이 없습니다. 일반전 기록은 포함하지 않습니다.</p>
          <template v-else>
            <p class="text-sm text-gray-400">TPP/FPP 기록은 별도로 표시합니다. — 표시는 API에서 제공되지 않은 값입니다.</p>
            <div v-for="entry in modes" :key="entry.key" class="space-y-4">
              <Stats v-if="entry.stat" :stat="entry.stat" :mode="entry.mode" :perspective="entry.perspective" />
            </div>
          </template>
        </template>
      </div>
    </template>
  </UModal>
</template>
