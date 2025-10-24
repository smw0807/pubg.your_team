<script setup lang="ts"></script>

<template>
  <div class="min-h-screen flex flex-col">
    <UApp>
      <MainHeader />

      <UMain class="container mx-auto px-5">
        <slot />
      </UMain>
    </UApp>
  </div>
</template>
