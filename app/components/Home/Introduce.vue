<template>
  <div class="bg-gray-900">
    <div class="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
      <div
        class="relative isolate overflow-hidden bg-gray-800 px-6 pt-16 after:pointer-events-none after:absolute after:inset-0 after:inset-ring after:inset-ring-white/10 sm:rounded-3xl sm:px-16 after:sm:rounded-3xl md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0"
      >
        <svg
          viewBox="0 0 1024 1024"
          aria-hidden="true"
          class="absolute top-1/2 left-1/2 -z-10 size-256 -translate-y-1/2 mask-[radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
        >
          <circle
            r="512"
            cx="512"
            cy="512"
            fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
            fill-opacity="0.7"
          />
          <defs>
            <radialGradient id="759c1415-0410-454c-8f7c-9a820de03641">
              <stop stop-color="#7775D6" />
              <stop offset="1" stop-color="#E935C1" />
            </radialGradient>
          </defs>
        </svg>
        <div
          class="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left"
        >
          <h2
            class="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl"
          >
            배틀그라운드, 함께 할 팀원을 찾아보세요
          </h2>
          <p class="mt-6 text-lg/8 text-pretty text-gray-300">
            원하는 플레이 스타일과 티어를 설정하고 방을 만들어보세요. 실시간
            채팅으로 팀원과 소통하며 최고의 팀을 구성할 수 있습니다.
          </p>
          <div
            class="mt-10 flex items-center justify-center gap-x-6 lg:justify-start"
          >
            <a
              href="#"
              class="rounded-md bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-white inset-ring inset-ring-white/5 hover:bg-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              시작하기
            </a>
            <a
              href="#"
              class="text-sm/6 font-semibold text-white hover:text-gray-100"
            >
              자세히 보기
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <div class="relative mt-16 h-80 lg:mt-8">
          <!-- TODO: 스크린샷 변경하기 -->
          <NuxtImg
            width="1824"
            height="1080"
            src="https://tailwindcss.com/plus-assets/img/component-images/dark-project-app-screenshot.png"
            alt="App screenshot"
            class="absolute top-0 left-0 w-228 max-w-none rounded-md bg-white/5 ring-1 ring-white/10"
          />
        </div>
      </div>
    </div>
  </div>
</template>
