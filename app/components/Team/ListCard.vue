<script setup lang="ts">
import type { Team } from '~/models/team';
import { modeTextTransform } from '~/utils/textTransform';

const toast = useToast();

const { team } = defineProps<{
  team: Team;
}>();

const emit = defineEmits<{
  (e: 'click', id: number): void;
}>();

const getTierColor = (tier: string) => {
  const tierColors: Record<
    string,
    | 'primary'
    | 'secondary'
    | 'success'
    | 'info'
    | 'warning'
    | 'error'
    | 'neutral'
  > = {
    bronze: 'warning', // 갈색/구리색 계열
    silver: 'neutral', // 회색 계열
    gold: 'warning', // 황금색 계열
    platinum: 'success', // 녹색 계열
    diamond: 'info', // 푸른 계열
  };
  return tierColors[tier] || 'neutral';
};

const getTierLabel = (tier: string) => {
  const tierLabels: Record<string, string> = {
    bronze: '브론즈',
    silver: '실버',
    gold: '골드',
    platinum: '플래티넘',
    crystal: '크리스탈',
    diamond: '다이아',
    master: '마스터',
    survivor: '서바이버',
  };
  return tierLabels[tier] || tier;
};

const getTierCustomClass = (tier: string) => {
  const customClasses: Record<string, string> = {
    bronze: 'bg-amber-800 text-amber-100 dark:bg-amber-900 dark:text-amber-200', // 갈색/구리색
    crystal:
      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', // 보라색/파란색 그라데이션
    master:
      'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', // 오렌지 계열 (브론즈와 골드 중간)
    survivor: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', // 붉은색/갈색 그라데이션
  };
  return customClasses[tier] || '';
};

const needsCustomColor = (tier: string) => {
  return ['bronze', 'crystal', 'master', 'survivor'].includes(tier);
};

const getDamageColor = (damage: number) => {
  if (damage < 100) {
    return 'neutral'; // 낮은 데미지 (회색)
  } else if (damage < 200) {
    return 'success'; // 보통 데미지 (녹색)
  } else if (damage < 300) {
    return 'info'; // 높은 데미지 (파란색)
  } else if (damage < 400) {
    return 'warning'; // 매우 높은 데미지 (노란색)
  } else {
    return 'error'; // 최고 데미지 (빨간색)
  }
};

const cType = computed(() => {
  return modeTextTransform(team.type);
});

const isFull = computed(() => {
  return team.type === 'duo'
    ? 2 <= team.members.length
    : 4 <= team.members.length;
});

const handleClick = () => {
  if (isFull.value) {
    toast.add({
      title: '방이 꽉 찼습니다.',
      color: 'error',
      orientation: 'horizontal',
    });
    return;
  }
  emit('click', team.id);
};
</script>

<template>
  <UCard
    class="hover:shadow-lg transition-shadow cursor-pointer"
    @click="handleClick"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UBadge v-if="team.isRanked" color="error" variant="outline">
          랭크
        </UBadge>
        <h3 class="text-lg font-semibold">{{ team.title }}</h3>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-300">
            [{{ team.members.length }}/ {{ team.type === 'duo' ? '2' : '4' }}]
          </span>
          <span class="text-sm text-gray-300">{{ cType }}</span>
        </div>
      </div>
    </template>

    <div class="py-2">
      <p class="text-sm text-gray-400">{{ team.description }}</p>
    </div>

    <template #footer>
      <div class="flex gap-2 flex-wrap">
        <UBadge
          v-if="team.tier && needsCustomColor(team.tier)"
          :class="getTierCustomClass(team.tier)"
        >
          {{ getTierLabel(team.tier) }}
        </UBadge>
        <UBadge
          v-else-if="team.tier"
          :color="getTierColor(team.tier)"
          variant="subtle"
        >
          {{ getTierLabel(team.tier) }}
        </UBadge>
        <UBadge
          v-if="team.damage"
          :color="getDamageColor(team.damage)"
          variant="subtle"
        >
          평딜 {{ team.damage }}+
        </UBadge>
      </div>
    </template>
  </UCard>
</template>
