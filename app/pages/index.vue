<script setup lang="ts"></script>

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
            alt="설명 이미지 1"
            class="object-contain rounded-xl shadow-lg mb-4"
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
            alt="설명 이미지 2"
            class="object-contain rounded-xl shadow-lg mb-4"
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
            alt="설명 이미지 3"
            class="object-contain rounded-xl shadow-lg mb-4"
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
            alt="설명 이미지 4"
            class="object-contain rounded-xl shadow-lg mb-4"
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
