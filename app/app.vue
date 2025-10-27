<script setup lang="ts">
import useAlert from '~/composables/useAlert';
import useConfirm from '~/composables/useConfirm';
import { Analytics } from '@vercel/analytics/nuxt';

const { alertOpen } = useAlert();
const { confirmOpen } = useConfirm();

// Google Analytics 설정
useHead({
  script: [
    {
      src: 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX',
      async: true,
    },
    {
      innerHTML: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-XXXXXXXXXX');
      `,
    },
  ],
});
</script>
<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
      <ModalCustomAlert :open="alertOpen" />
      <ModalCustomConfirm :open="confirmOpen" />
    </NuxtLayout>
    <Analytics />
  </div>
</template>
