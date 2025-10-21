<script setup lang="ts">
import useAuth from '~/composables/useAuth';
import UserProfile from '~/components/Modal/UserProfile.vue';

const { signIn, user, signOut } = useAuth();
const { openConfirm } = useConfirm();

const handleSignIn = async () => {
  await signIn();
};

const handleSignOut = async () => {
  openConfirm('로그아웃', '로그아웃하시겠습니까?', async () => {
    await signOut();
  });
};
</script>

<template>
  <UHeader title="PUBG Your Team">
    <template #right>
      <template v-if="user">
        <UserProfile />
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
