<script setup lang="ts">
import useAlert from '~/composables/useAlert';

const { alertOpen } = useAlert();
</script>
<template>
  <div>
    <NuxtLayout>
      <ModalCustomAlert :open="alertOpen" />
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
