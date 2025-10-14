<script setup lang="ts">
import useAuth from '~/composables/useAuth';
const { signIn, user, signOut } = useAuth();

const handleSignIn = async () => {
  await signIn();
};

const handleSignOut = async () => {
  await signOut();
};
</script>

<template>
  <UHeader title="PUBG Your Team">
    <template #right>
      <template v-if="user">
        <UButton color="info" variant="ghost">
          <UIcon name="i-heroicons-user-circle" class="w-6 h-6" />
        </UButton>
        <UUser
          :name="user?.displayName as string"
          :description="user?.email as string"
          :avatar="{ src: user?.photoURL as string }"
        />
        <UButton color="warning" variant="ghost" @click="handleSignOut">
          <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-6 h-6" />
        </UButton>
      </template>
      <template v-if="!user">
        <UButton color="info" @click="handleSignIn">Login</UButton>
      </template>
    </template>

    <NavigationMenu />
  </UHeader>
</template>
