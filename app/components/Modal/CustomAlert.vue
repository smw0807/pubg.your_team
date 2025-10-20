<script setup lang="ts">
import useAlert from '~/composables/useAlert';

const { alertOpen, alertTitle, alertDescription, closeAlert } = useAlert();

const handleUpdateOpen = (open: boolean) => {
  console.log('handleUpdateOpen', open);
  alertOpen.value = open;
};
</script>
<template>
  <UModal
    :open="alertOpen"
    :title="alertTitle"
    :description="alertDescription || '알림'"
    :dismissible="false"
    @update:open="handleUpdateOpen"
  >
    <template #footer>
      <UButton color="primary" size="lg" @click="closeAlert"> 확인 </UButton>
    </template>
  </UModal>
</template>
