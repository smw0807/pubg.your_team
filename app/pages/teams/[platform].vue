<script setup lang="ts">
import { mockTeams } from '~/assets/mock/temas';

const { platform } = useRoute().params;
</script>
<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-center items-center">{{ platform }}</div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TeamListCard v-for="team in mockTeams" :key="team.id" :team="team" />
    </div>
  </div>
</template>
