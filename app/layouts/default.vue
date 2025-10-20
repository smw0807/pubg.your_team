<script setup lang="ts">
import useAlert from '~/composables/useAlert';
import useConfirm from '~/composables/useConfirm';

const { alertOpen } = useAlert();
const { confirmOpen } = useConfirm();
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <UApp>
      <ModalCustomAlert :open="alertOpen" />
      <ModalCustomConfirm :open="confirmOpen" />

      <MainHeader />

      <UMain class="container mx-auto px-5">
        <slot />
      </UMain>

      <UFooter>
        <h1>Footer</h1>
      </UFooter>
    </UApp>
  </div>
</template>
