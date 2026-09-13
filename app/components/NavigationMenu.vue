<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const { orientation = 'horizontal' } = defineProps<{ orientation?: 'horizontal' | 'vertical' }>();
const emit = defineEmits<{ select: [] }>();
const items: NavigationMenuItem[][] = [
  [
    {
      label: '카카오 팀 찾기',
      to: '/teams/kakao',
      onSelect: () => emit('select'),
    },
    {
      label: '스팀 팀 찾기',
      to: '/teams/steam',
      onSelect: () => emit('select'),
    },
  ],
];
</script>

<template>
  <UNavigationMenu :items="items" :orientation="orientation" aria-label="플랫폼별 팀 찾기" class="data-[orientation=vertical]:w-full" :ui="{ link: 'min-h-11' }" />
</template>
