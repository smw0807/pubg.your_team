<script setup lang="ts">
import type { GameMode, GameType, Platform, Tier } from '~/models/common';
import { platformTextTransform } from '~/utils/textTransform';
import { gameTypeOptions, gameModeOptions, tierOptions } from '~/constants/options';
import { getFirestore } from 'firebase/firestore';
import useFirebase from '~/utils/firebase';
import { subscribeTeams } from '~/services/teamList';

definePageMeta({
  key: (route) => route.path,
  validate: (route) => route.params.platform === 'steam' || route.params.platform === 'kakao',
});

const platform = useRoute().params.platform as Platform;

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

const selectedGameType = ref<GameType>('all');
const selectedGameMode = ref<GameMode>('all');
const selectedTier = ref<Tier>('all');

const filters = computed(() => ({ platform, gameType: selectedGameType.value, mode: selectedGameMode.value, tier: selectedTier.value }));
const { teams: teamList, isLoading, hasLoaded, fromCache, isOffline, errorMessage, start, refresh, pageNumber, hasNext, hasPrevious, firstPage, nextPage, previousPage } = useTeamList(filters, subscribeTeams(getFirestore(useFirebase().app)));
const hasFilters = computed(() => selectedGameType.value !== 'all' || selectedGameMode.value !== 'all' || selectedTier.value !== 'all');
const resetFilters = () => {
  selectedGameType.value = 'all';
  selectedGameMode.value = 'all';
  selectedTier.value = 'all';
};

const handleClick = (id: string) => {
  navigateTo(`/room/${id}`);
};

onMounted(start);
</script>

<template>
  <div class="container mx-auto py-4 sm:px-4 sm:py-8">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ platformTextTransform(platform) }} 팀 찾기</h1>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div class="flex flex-wrap items-center gap-3">
        <USelect
          v-model="selectedGameType"
          aria-label="게임 유형"
          :items="gameTypeOptions"
          option-attribute="label"
          value-attribute="value"
          class="w-30"
        />
        <USelect
          v-model="selectedGameMode"
          aria-label="팀 모드"
          :items="gameModeOptions"
          option-attribute="label"
          value-attribute="value"
          class="w-30"
        />
        <USelect
          v-model="selectedTier"
          aria-label="티어"
          :items="tierOptions"
          option-attribute="label"
          value-attribute="value"
          class="w-30"
        />
      </div>
      <div class="flex items-center">
        <UButton color="neutral" size="lg" variant="ghost" aria-label="팀 목록 새로고침" :loading="isLoading && !isOffline" :disabled="isOffline" @click="refresh">
          <UIcon name="i-heroicons-arrow-path-20-solid" class="w-6 h-6" />
        </UButton>
        <ModalCreateTeam />
      </div>
    </div>

    <div v-if="isOffline || (fromCache && !errorMessage)" role="status" class="mb-4 rounded-lg border border-orange-400 p-4">
      {{ isOffline ? '오프라인입니다. 저장된 목록은 최신 상태가 아닐 수 있습니다. 연결이 돌아오면 자동으로 갱신합니다.' : '서버의 최신 목록을 확인하고 있습니다. 저장된 목록은 실제 모집 상태와 다를 수 있습니다.' }}
    </div>
    <div v-if="errorMessage" role="alert" class="mb-4 rounded-lg border border-red-400 p-4 space-y-2">
      <p>{{ errorMessage }}</p>
      <p v-if="teamList.length" class="text-sm">아래는 마지막으로 확인한 목록입니다. 현재 모집 상태와 다를 수 있습니다.</p>
      <UButton :disabled="isOffline" variant="outline" @click="refresh">다시 시도</UButton>
    </div>
    <p v-if="isLoading && !isOffline" role="status" class="py-6 text-center">팀 목록을 불러오는 중입니다...</p>
    <div v-else-if="hasLoaded && !teamList.length && !errorMessage && !fromCache && !isOffline" role="status" class="rounded-xl border border-gray-700 p-8 text-center space-y-3">
      <p>{{ hasNext || hasPrevious ? '이 페이지에는 모집 중인 팀이 없습니다. 다른 페이지를 확인해주세요.' : hasFilters ? '선택한 조건에 맞는 팀이 없습니다.' : '아직 모집 중인 팀이 없습니다. 첫 팀을 만들어보세요.' }}</p>
      <UButton v-if="hasFilters" variant="outline" @click="resetFilters">필터 초기화</UButton>
    </div>
    <p v-if="hasLoaded && teamList.length" role="status" class="mb-3 text-sm text-gray-400">현재 페이지 {{ teamList.length }}개 팀 · {{ errorMessage || fromCache || isOffline ? '마지막 확인 목록' : '실시간 갱신' }}</p>
    <div :aria-busy="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <TeamListCard
        v-for="team in teamList"
        :key="team.id"
        :team="team"
        @click="handleClick"
      />
    </div>
    <nav v-if="hasLoaded || hasPrevious" aria-label="팀 목록 페이지" class="mt-6 flex flex-wrap items-center justify-center gap-3">
      <UButton class="min-h-11" variant="outline" :disabled="isLoading || isOffline || !hasPrevious" @click="previousPage">이전 페이지</UButton>
      <span role="status" aria-live="polite">{{ pageNumber }}페이지</span>
      <UButton class="min-h-11" variant="outline" :disabled="isLoading || isOffline || fromCache || !!errorMessage || !hasNext" @click="nextPage">다음 페이지</UButton>
      <UButton v-if="hasPrevious" class="min-h-11" variant="ghost" :disabled="isLoading || isOffline" @click="firstPage">최신 팀으로</UButton>
    </nav>
  </div>
</template>
