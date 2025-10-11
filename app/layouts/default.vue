<template>
  <div class="min-h-screen flex flex-col">
    <UApp>
      <MainHeader />

      <UMain>
        <slot />
      </UMain>

      <UFooter>
        <h1>Footer</h1>
      </UFooter>
    </UApp>
  </div>
</template>
