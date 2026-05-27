<script setup lang="ts">
import type { GameMode, GameType, Platform, Tier } from '~/models/common';
import { platformTextTransform } from '~/utils/textTransform';
import { gameTypeOptions, gameModeOptions, tierOptions } from '~/constants/options';

const { platform } = useRoute().params as { platform: string };

const platformName = platformTextTransform(platform);
const pageTitle = `${platformName} 팀 찾기 - PUBG 팀 매칭`;
const pageDescription = `배틀그라운드 ${platformName} 플랫폼에서 팀원을 찾아보세요. 실시간 팀 매칭, 채팅, 전적 조회 기능을 제공합니다.`;
const ogImage = 'https://www.pubgyourteam.kr/images/home/introduce.png';

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage,
  ogUrl: `https://www.pubgyourteam.kr/teams/${platform}`,
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage,
});

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: pageTitle,
        description: pageDescription,
        url: `https://www.pubgyourteam.kr/teams/${platform}`,
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: '홈', item: 'https://www.pubgyourteam.kr' },
            { '@type': 'ListItem', position: 2, name: `${platformName} 팀 찾기`, item: `https://www.pubgyourteam.kr/teams/${platform}` },
          ],
        },
      }),
    },
  ],
});

const { getTeams, teamList } = useTeam();

const selectedGameType = ref<GameType>('all');
const selectedGameMode = ref<GameMode>('all');
const selectedTier = ref<Tier>('all');

const search = async () => {
  await getTeams(platform as Platform, selectedGameType.value, selectedGameMode.value, selectedTier.value);
};

const handleClick = (id: string) => {
  navigateTo(`/room/${id}`);
};

onMounted(search);
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ platformTextTransform(platform) }} 팀 찾기</h1>
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
        <UButton color="neutral" size="lg" variant="ghost" @click="search">
          <UIcon name="i-heroicons-arrow-path-20-solid" class="w-6 h-6" />
        </UButton>
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
