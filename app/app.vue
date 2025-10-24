<script setup lang="ts">
import useAlert from '~/composables/useAlert';
import useConfirm from '~/composables/useConfirm';
import { Analytics } from '@vercel/analytics/nuxt';

const { alertOpen } = useAlert();
const { confirmOpen } = useConfirm();
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
