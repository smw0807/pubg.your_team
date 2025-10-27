<script setup lang="ts">
// SEO 메타 태그 설정
useHead({
  title: 'PUBG 팀 매칭 - 배틀그라운드 팀원 찾기',
  meta: [
    {
      name: 'description',
      content:
        '배틀그라운드(PUBG) 팀원을 찾고 매칭하는 플랫폼. 카카오, 스팀 플랫폼 지원, 실시간 채팅, 전적 조회 기능 제공.',
    },
    { property: 'og:title', content: 'PUBG 팀 매칭 - 배틀그라운드 팀원 찾기' },
    {
      property: 'og:description',
      content:
        '배틀그라운드(PUBG) 팀원을 찾고 매칭하는 플랫폼. 카카오, 스팀 플랫폼 지원, 실시간 채팅, 전적 조회 기능 제공.',
    },
    {
      property: 'og:image',
      content: 'https://www.pubgyourteam.kr/images/home/introduce.png',
    },
    { property: 'og:url', content: 'https://www.pubgyourteam.kr/' },
    { name: 'twitter:title', content: 'PUBG 팀 매칭 - 배틀그라운드 팀원 찾기' },
    {
      name: 'twitter:description',
      content:
        '배틀그라운드(PUBG) 팀원을 찾고 매칭하는 플랫폼. 카카오, 스팀 플랫폼 지원, 실시간 채팅, 전적 조회 기능 제공.',
    },
    {
      name: 'twitter:image',
      content: 'https://www.pubgyourteam.kr/images/home/introduce.png',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'PUBG 팀 매칭',
        description: '배틀그라운드(PUBG) 팀원을 찾고 매칭하는 플랫폼',
        url: 'https://www.pubgyourteam.kr/',
        applicationCategory: 'Game',
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'KRW',
        },
        creator: {
          '@type': 'Organization',
          name: 'PUBG 팀 매칭',
        },
        featureList: [
          '팀원 매칭',
          '실시간 채팅',
          '전적 조회',
          '카카오 플랫폼 지원',
          '스팀 플랫폼 지원',
        ],
      }),
    },
  ],
});
</script>

<template>
  <div>
    <HomeIntroduce />

    <section class="one-col-imgs my-14">
      <div>
        <div class="col">
          <NuxtImg
            width="800"
            height="500"
            src="/images/home/1.png"
            alt="PUBG 닉네임 등록 및 전적 조회 방법"
            class="object-contain rounded-xl shadow-lg mb-4"
            loading="lazy"
            format="webp"
            quality="85"
          />
          <h3 class="text-lg font-semibold mb-2">
            STEP 1. 플레이 중인 닉네임 등록
          </h3>
          <p class="text-gray-500">
            플레이 중인 닉네임을 등록하고, 스탯과 최근매치를 조회해 보세요
          </p>
        </div>
        <div class="col">
          <NuxtImg
            width="800"
            height="1000"
            src="/images/home/2.png"
            alt="PUBG 팀 생성 및 팀원 모집 방법"
            class="object-contain rounded-xl shadow-lg mb-4"
            loading="lazy"
            format="webp"
            quality="85"
          />
          <h3 class="text-lg font-semibold mb-2">
            STEP 2. 팀 생성 및 팀원 모집
          </h3>
          <p class="text-gray-500">팀을 생성하고, 팀원을 모집해보세요.</p>
        </div>
        <div class="col">
          <NuxtImg
            width="1000"
            height="500"
            src="/images/home/3.png"
            alt="PUBG 팀원들과 실시간 채팅 소통 방법"
            class="object-contain rounded-xl shadow-lg mb-4"
            loading="lazy"
            format="webp"
            quality="85"
          />
          <h3 class="text-lg font-semibold mb-2">
            STEP 3. 채팅방 및 팀원들과 실시간 소통
          </h3>
          <p class="text-gray-500">팀원들과 실시간 소통해보세요.</p>
        </div>
        <div class="col">
          <NuxtImg
            width="1000"
            height="500"
            src="/images/home/4.png"
            alt="PUBG 닉네임 복사 및 전적 조회 기능"
            class="object-contain rounded-xl shadow-lg mb-4"
            loading="lazy"
            format="webp"
            quality="85"
          />
          <h3 class="text-lg font-semibold mb-2">
            STEP 4. 닉네임 복사와 전적, 최근 매치 조회
          </h3>
          <p class="text-gray-500">
            접속중인 팀원의 닉네임을 복사하고, 전적과 최근 매치를 조회해 보세요
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
<style scoped>
.one-col-imgs .col {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2.5rem;
}
@media (min-width: 768px) {
  .one-col-imgs .col {
    margin-bottom: 3rem;
  }
}
</style>
