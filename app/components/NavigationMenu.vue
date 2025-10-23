<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const items = ref<NavigationMenuItem[][]>([
  [
    {
      label: 'Links',
      type: 'label',
    },
    {
      label: '카카오 팀 찾기',
      to: '/teams/kakao',
    },
    {
      label: '스팀 팀 찾기',
      to: '/teams/steam',
    },
  ],
]);
</script>

<template>
  <UNavigationMenu :items="items" class="data-[orientation=vertical]:w-48" />
</template>
