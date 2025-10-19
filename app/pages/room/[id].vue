<script setup lang="ts">
const { id } = useRoute().params as { id: string };
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold">팀 상세 : {{ id }}</h1>
  </div>
</template>
