<script setup lang="ts">
import useAlert from '~/composables/useAlert';
import useConfirm from '~/composables/useConfirm';

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
  </div>
</template>
