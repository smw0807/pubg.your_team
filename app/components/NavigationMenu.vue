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
      icon: 'i-lucide-search',
      to: '/kakao-team-finder',
    },
    {
      label: '스팀 팀 찾기',
      icon: 'i-lucide-search',
      to: '/steam-team-finder',
    },
  ],
  // [
  //   {
  //     label: 'GitHub',
  //     icon: 'i-simple-icons-github',
  //     badge: '3.8k',
  //     to: 'https://github.com/nuxt/ui',
  //     target: '_blank',
  //   },
  //   {
  //     label: 'Help',
  //     icon: 'i-lucide-circle-help',
  //     disabled: true,
  //   },
  // ],
]);
</script>

<template>
  <UNavigationMenu :items="items" class="data-[orientation=vertical]:w-48" />
</template>
