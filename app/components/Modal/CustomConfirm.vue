<script setup lang="ts">
import useConfirm from '~/composables/useConfirm';

const {
  confirmOpen,
  confirmTitle,
  confirmDescription,
  closeConfirm,
  handleConfirm,
  confirmPending,
  confirmError,
} = useConfirm();

const handleUpdateOpen = (open: boolean) => {
  if (!open) closeConfirm();
};
</script>
<template>
  <UModal
    :open="confirmOpen"
    :title="confirmTitle"
    :description="confirmDescription"
    :dismissible="false"
    :close="!confirmPending"
    style="z-index: 100001"
    @update:open="handleUpdateOpen"
  >
    <template #footer>
      <div class="flex flex-col gap-3 w-full">
        <p v-if="confirmError" role="alert" class="text-red-500">{{ confirmError }}</p>
        <div class="flex gap-2 justify-end">
          <UButton color="neutral" variant="outline" :disabled="confirmPending" @click="closeConfirm">
            취소
          </UButton>
          <UButton color="primary" :loading="confirmPending" :disabled="confirmPending" @click="handleConfirm"> 확인 </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
