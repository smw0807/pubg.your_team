<script setup lang="ts"></script>

<template>
  <div class="min-h-dvh flex flex-col">
    <UApp>
      <MainHeader />

      <UMain class="container mx-auto min-w-0 px-3 sm:px-5">
        <slot />
      </UMain>
    </UApp>
  </div>
</template>
