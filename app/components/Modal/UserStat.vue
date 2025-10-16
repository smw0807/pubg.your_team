<script setup lang="ts">
const { platform, nickname } = defineProps<{
  platform: string;
  nickname: string;
}>();
</script>

<template>
  <UModal title="스탯 확인" description="현재 스탯을 확인할 수 있습니다.">
    <UTooltip text="스탯 확인">
      <UButton color="info" variant="ghost">
        <UIcon name="i-heroicons-magnifying-glass" class="w-6 h-6" />
      </UButton>
    </UTooltip>

    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <span class="text-sm text-gray-500"
            >{{ platformTextTransform(platform) }} 닉네임</span
          >
          <span class="text-lg font-bold">{{ nickname }}</span>
        </div>
      </div>
    </template>
  </UModal>
</template>
