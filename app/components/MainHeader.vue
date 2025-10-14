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
        <UUser
          :name="user?.displayName as string"
          :description="user?.email as string"
          :avatar="{ src: user?.photoURL as string }"
        />
        <UButton color="info" @click="handleSignOut">Logout</UButton>
      </template>
      <template v-if="!user">
        <UButton color="info" @click="handleSignIn">Login</UButton>
      </template>
    </template>

    <NavigationMenu />
  </UHeader>
</template>
