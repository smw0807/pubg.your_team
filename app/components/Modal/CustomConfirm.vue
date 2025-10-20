<script setup lang="ts">
import useConfirm from '~/composables/useConfirm';

const {
  confirmOpen,
  confirmTitle,
  confirmDescription,
  closeConfirm,
  handleConfirm,
} = useConfirm();

const handleUpdateOpen = (open: boolean) => {
  confirmOpen.value = open;
};
</script>
<template>
  <UModal
    :open="confirmOpen"
    :title="confirmTitle"
    :description="confirmDescription"
    :dismissible="false"
    @update:open="handleUpdateOpen"
  >
    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton color="neutral" variant="outline" @click="closeConfirm">
          취소
        </UButton>
        <UButton color="primary" @click="handleConfirm"> 확인 </UButton>
      </div>
    </template>
  </UModal>
</template>
