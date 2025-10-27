// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/icon',
    '@nuxt/scripts',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/sitemap',
  ],

  app: {
    head: {
      title: 'PUBG 팀 매칭 - 배틀그라운드 팀원 찾기',
      titleTemplate: '%s | PUBG 팀 매칭',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            '배틀그라운드(PUBG) 팀원을 찾고 매칭하는 플랫폼. 카카오, 스팀 플랫폼 지원, 실시간 채팅, 전적 조회 기능 제공.',
        },
        {
          name: 'keywords',
          content:
            'PUBG, 배틀그라운드, 팀매칭, 팀원찾기, 카카오, 스팀, 전적조회, 채팅, 배그팀찾기',
        },
        {
          name: 'naver-site-verification',
          content: '29c95d2b155635e22e1a4e08b412e44ae89a1820',
        },
        { name: 'author', content: 'PUBG 팀 매칭' },
        { name: 'robots', content: 'index, follow' },
        { name: 'googlebot', content: 'index, follow' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'PUBG 팀 매칭' },
        { property: 'og:locale', content: 'ko_KR' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@pubgteam' },
        { name: 'theme-color', content: '#1f2937' },
        { name: 'msapplication-TileColor', content: '#1f2937' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'canonical', href: 'https://www.pubgyourteam.kr/' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'apple-touch-icon', href: '/favicon.ico' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  icon: {
    collections: ['lucide'],
    serverBundle: 'auto',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  // 성능 최적화 설정
  experimental: {
    payloadExtraction: false,
  },

  // 이미지 최적화 설정
  image: {
    quality: 85,
    format: ['webp', 'avif'],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
  },

  // 렌더링 최적화
  ssr: true,
  nitro: {
    compressPublicAssets: true,
    devProxy: {
      '/api': {
        target: process.env.API_URL,
        changeOrigin: true,
        prependPath: true,
      },
    },
  },

  site: {
    url: 'https://www.pubgyourteam.kr/',
    name: 'PUBG 팀 매칭',
    description: '배틀그라운드(PUBG) 팀원을 찾고 매칭하는 플랫폼',
    defaultLocale: 'ko',
  },

  runtimeConfig: {
    public: {
      apiKey: process.env.FB_API_KEY,
      authDomain: process.env.FB_AUTH_DOMAIN,
      projectId: process.env.FB_PROJECT_ID,
      storageBucket: process.env.FB_STORAGE_BUCKET,
      messagingSenderId: process.env.FB_MESSAGING_SENDER_ID,
      appId: process.env.FB_APP_ID,
      measurementId: process.env.FB_MEASUREMENT_ID,
      matchUrl: process.env.MATCH_URL,
      apiUrl: process.env.API_URL,
    },
  },
});
