<template>
  <footer class="bg-gray-900 text-white">
    <div class="container mx-auto px-5 py-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- 로고 및 설명 -->
        <div class="col-span-1 md:col-span-2">
          <h3 class="text-xl font-bold mb-4">PUBG Your Team</h3>
          <p class="text-gray-300 mb-4">
            PUBG 플레이어들을 위한 최고의 팀 매칭 플랫폼입니다. 함께 승리하는
            팀을 찾아보세요.
          </p>
          <div class="flex space-x-4">
            <a
              href="#"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <Icon name="i-simple-icons-discord" class="w-6 h-6" />
            </a>
            <a
              href="#"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <Icon name="i-simple-icons-twitter" class="w-6 h-6" />
            </a>
            <a
              href="#"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <Icon name="i-simple-icons-youtube" class="w-6 h-6" />
            </a>
          </div>
        </div>

        <!-- 빠른 링크 -->
        <div>
          <h4 class="text-lg font-semibold mb-4">빠른 링크</h4>
          <ul class="space-y-2">
            <li>
              <NuxtLink
                to="/"
                class="text-gray-300 hover:text-white transition-colors"
              >
                홈
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/teams"
                class="text-gray-300 hover:text-white transition-colors"
              >
                팀 찾기
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/stats"
                class="text-gray-300 hover:text-white transition-colors"
              >
                통계
              </NuxtLink>
            </li>
            <li>
              <a
                href="#"
                class="text-gray-300 hover:text-white transition-colors"
              >
                커뮤니티
              </a>
            </li>
          </ul>
        </div>

        <!-- 지원 -->
        <div>
          <h4 class="text-lg font-semibold mb-4">지원</h4>
          <ul class="space-y-2">
            <li>
              <a
                href="#"
                class="text-gray-300 hover:text-white transition-colors"
              >
                도움말
              </a>
            </li>
            <li>
              <a
                href="#"
                class="text-gray-300 hover:text-white transition-colors"
              >
                문의하기
              </a>
            </li>
            <li>
              <a
                href="#"
                class="text-gray-300 hover:text-white transition-colors"
              >
                이용약관
              </a>
            </li>
            <li>
              <a
                href="#"
                class="text-gray-300 hover:text-white transition-colors"
              >
                개인정보처리방침
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- 하단 구분선 및 저작권 -->
      <div class="border-t border-gray-700 mt-8 pt-6">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <p class="text-gray-400 text-sm">
            © 2024 PUBG Your Team. All rights reserved.
          </p>
          <div class="flex space-x-6 mt-4 md:mt-0">
            <span class="text-gray-400 text-sm"
              >Made with ❤️ for PUBG players</span
            >
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
// 푸터 컴포넌트
</script>
