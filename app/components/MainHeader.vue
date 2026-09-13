<script setup lang="ts">
import useAuth from '~/composables/useAuth';
import UserProfile from '~/components/Modal/UserProfile.vue';

const { signIn, user, signOut, isAuthReady } = useAuth();
const { openConfirm } = useConfirm();
const { openAlert } = useAlert();
const isSigningIn = ref(false);

const handleSignIn = async () => {
  if (isSigningIn.value) return;
  isSigningIn.value = true;
  try { await signIn(); }
  catch { openAlert('로그인 실패', '로그인을 완료하지 못했습니다. 팝업 허용과 인터넷 연결을 확인해주세요.'); }
  finally { isSigningIn.value = false; }
};

const handleSignOut = async () => {
  openConfirm('로그아웃', '로그아웃하시겠습니까?', async () => {
    const result = await signOut();
    if (result.roomCleanupFailed) openAlert('로그아웃 완료', '로그아웃은 완료됐지만 팀 퇴장은 확인하지 못했습니다. 연결 후 다시 입장해 퇴장해주세요.');
  });
};
</script>

<template>
  <UHeader title="PUBG Your Team">
    <template #right>
      <template v-if="user">
        <UserProfile />
        <UUser
          :name="user.displayName as string"
          :description="user.email as string"
          :avatar="{ src: user.photoURL as string }"
        />
        <UButton color="warning" variant="ghost" @click="handleSignOut">
          <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-6 h-6" />
        </UButton>
      </template>
      <template v-else>
        <UButton color="info" :loading="!isAuthReady || isSigningIn" :disabled="!isAuthReady || isSigningIn" @click="handleSignIn">Login</UButton>
      </template>
    </template>

    <NavigationMenu />
  </UHeader>
</template>
