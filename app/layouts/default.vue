<script setup lang="ts"></script>

<template>
  <div class="min-h-screen flex flex-col">
    <UApp>
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
