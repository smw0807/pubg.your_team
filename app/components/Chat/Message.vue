<script setup lang="ts">
import type { User } from 'firebase/auth';
import type { ChatMessage } from '~/models/chat';

const { message, user } = defineProps<{
  message: ChatMessage;
  user: User | null;
}>();

// URL 감지 및 링크 변환 함수 (안전한 방법)
const formatMessageWithLinks = (text: string) => {
  const urlSplitRegex = /(https?:\/\/[^\s]+)/g;
  const urlPartRegex = /^https?:\/\/[^\s]+$/;
  const parts = text.split(urlSplitRegex);

  return parts.map((part) => {
    if (urlPartRegex.test(part)) {
      return {
        type: 'link',
        url: part,
        text: part,
      };
    }
    return {
      type: 'text',
      text: part,
    };
  });
};

// 메시지에서 URL 추출
const extractUrls = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

// 링크 미리보기 상태
const showPreview = computed(() => hasUrls.value);
const previewData = ref<{
  url: string;
  domain: string;
  title: string;
  description: string;
} | null>(null);
const isLoading = ref(false);

// URL에서 도메인 추출
const getDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

// 링크 미리보기 데이터 로드
const loadPreviewData = async () => {
  const urls = extractUrls(message.message);
  if (urls.length === 0) return;

  isLoading.value = true;

  // 간단한 미리보기 데이터 (실제로는 Open Graph API 등을 사용할 수 있음)
  const firstUrl = urls[0];
  if (firstUrl) {
    previewData.value = {
      url: firstUrl,
      domain: getDomain(firstUrl),
      title: getDomain(firstUrl),
      description: '링크를 클릭하여 이동하세요',
    };
  }

  isLoading.value = false;
};

const hasUrls = computed(() => extractUrls(message.message).length > 0);

// 링크가 있을 때 자동으로 미리보기 데이터 로드
watch(
  hasUrls,
  (newValue) => {
    if (newValue && !previewData.value) {
      loadPreviewData();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="max-w-xs lg:max-w-md relative group"
    :class="
      message.uid === user?.uid
        ? 'flex flex-col items-end'
        : 'flex flex-col items-start'
    "
  >
    <!-- 메시지 박스 -->
    <div
      class="relative px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl"
      :class="
        message.uid === user?.uid
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
          : 'bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-bl-md'
      "
    >
      <!-- 메시지 내용 -->
      <div class="text-sm font-medium leading-relaxed">
        <template
          v-for="(part, index) in formatMessageWithLinks(message.message)"
          :key="index"
        >
          <a
            v-if="part.type === 'link'"
            :href="part.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-300 hover:text-blue-200 underline decoration-dotted underline-offset-2 transition-colors duration-200"
          >
            {{ part.text }}
          </a>
          <span v-else>{{ part.text }}</span>
        </template>
      </div>

      <!-- 시간 -->
      <div
        class="text-xs mt-2 opacity-75"
        :class="message.uid === user?.uid ? 'text-right' : 'text-left'"
      >
        {{ message.createdAt }}
      </div>

      <!-- 말풍선 꼬리 -->
      <div
        v-if="message.uid === user?.uid"
        class="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 transform rotate-45"
      />
      <div
        v-else
        class="absolute -bottom-1 -left-1 w-3 h-3 bg-gray-700 transform rotate-45"
      />
    </div>

    <!-- 발신자 이름 -->
    <div
      class="text-xs text-gray-400 mt-1 px-2"
      :class="message.uid === user?.uid ? 'text-right' : 'text-left'"
    >
      {{ message.uid === user?.uid ? '나' : message.sender }}
    </div>

    <!-- 링크 미리보기 -->
    <div
      v-if="showPreview && previewData"
      class="mt-3 max-w-sm"
      :class="message.uid === user?.uid ? 'ml-auto' : 'mr-auto'"
    >
      <div
        class="bg-gray-800/80 border border-gray-600/50 rounded-lg p-3 shadow-lg"
      >
        <div v-if="isLoading" class="flex items-center gap-2">
          <div
            class="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"
          />
          <span class="text-xs text-gray-300">로딩 중...</span>
        </div>

        <div v-else class="space-y-2">
          <div class="flex items-center gap-2">
            <div
              class="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center"
            >
              <span class="text-white text-xs font-bold">🔗</span>
            </div>
            <span class="text-xs text-gray-300 font-medium">{{
              previewData?.domain
            }}</span>
          </div>

          <div class="text-sm text-white font-medium line-clamp-2">
            {{ previewData?.title }}
          </div>

          <div class="text-xs text-gray-400 line-clamp-2">
            {{ previewData?.description }}
          </div>

          <a
            :href="previewData?.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 transition-colors duration-200"
          >
            링크 열기
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
