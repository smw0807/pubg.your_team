<script setup lang="ts">
import type { GameMode, GameType, Platform, Tier } from '~/models/common';
import { platformTextTransform } from '~/utils/textTransform';
import {
  gameTypeOptions,
  gameModeOptions,
  tierOptions,
} from '~/constants/options';

const { platform } = useRoute().params as { platform: string };

const { getTeams, teamList } = useTeam();

const selectedGameType = ref<GameType>('all');
const selectedGameMode = ref<GameMode>('all');
const selectedTier = ref<Tier>('all');

const handleClick = (id: string) => {
  console.log(id);
};

const search = async () => {
  await getTeams(
    platform as Platform,
    selectedGameType.value,
    selectedGameMode.value,
    selectedTier.value
  );
};

onMounted(async () => {
  await search();
});
</script>
<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">
        {{ platformTextTransform(platform) }} 팀 찾기
      </h1>
    </div>

    <div class="flex items-center justify-between gap-4 mb-4">
      <div class="flex items-center gap-4">
        <USelect
          v-model="selectedGameType"
          :items="gameTypeOptions"
          option-attribute="label"
          value-attribute="value"
          class="w-30"
          @update:model-value="search"
        />
        <USelect
          v-model="selectedGameMode"
          :items="gameModeOptions"
          option-attribute="label"
          value-attribute="value"
          class="w-30"
          @update:model-value="search"
        />
        <USelect
          v-model="selectedTier"
          :items="tierOptions"
          option-attribute="label"
          value-attribute="value"
          class="w-30"
          @update:model-value="search"
        />
      </div>
      <div class="flex items-center">
        <!-- 방 리스트 새로고침 버튼 아이콘 -->
        <UButton color="neutral" size="lg" variant="ghost" @click="search">
          <UIcon name="i-heroicons-arrow-path-20-solid" class="w-6 h-6" />
        </UButton>
        <!-- 방 만들기 버튼 -->
        <ModalCreateTeam />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TeamListCard
        v-for="team in teamList"
        :key="team.id"
        :team="team"
        @click="handleClick"
      />
    </div>
  </div>
</template>
