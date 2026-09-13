<script setup lang="ts">
import useAuth from '~/composables/useAuth';

const { signIn, user, signOut, isAuthReady } = useAuth();
const { openConfirm } = useConfirm();
const { openAlert } = useAlert();
const isSigningIn = ref(false);
const menuOpen = ref(false);
const profileOpen = ref(false);

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
  <UHeader v-model:open="menuOpen" title="PUBG Your Team" :menu="{ title: '팀 찾기 메뉴', description: '플랫폼을 선택해 팀을 찾아보세요.' }" :ui="{ title: 'text-base sm:text-xl', container: 'gap-1 px-3 sm:px-6', right: 'gap-0.5 sm:gap-1.5' }">
    <template #toggle="{ open, toggle }">
      <UButton color="neutral" variant="ghost" class="min-h-11 min-w-11 justify-center lg:hidden" :aria-label="open ? '메뉴 닫기' : '메뉴 열기'" :aria-expanded="open" :icon="open ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" @click="toggle" />
    </template>
    <template #right>
      <template v-if="user">
        <UButton color="info" variant="ghost" aria-label="게임 닉네임 관리" class="min-h-11 min-w-11 justify-center" icon="i-heroicons-user-circle" @click="menuOpen = false; profileOpen = true" />
        <UUser
          class="hidden xl:flex"
          :name="user.displayName as string"
          :description="user.email as string"
          :avatar="{ src: user.photoURL as string }"
        />
        <UButton color="warning" variant="ghost" aria-label="로그아웃" class="min-h-11 min-w-11 justify-center" @click="handleSignOut">
          <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-6 h-6" />
        </UButton>
      </template>
      <template v-else>
        <UButton color="info" class="min-h-11" :loading="!isAuthReady || isSigningIn" :disabled="!isAuthReady || isSigningIn" @click="handleSignIn">로그인</UButton>
      </template>
    </template>

    <NavigationMenu />
    <template #body>
      <NavigationMenu orientation="vertical" @select="menuOpen = false" />
      <p v-if="user" class="mt-6 text-sm text-muted break-all">{{ user.displayName }}</p>
    </template>
  </UHeader>
  <LazyModalUserProfile v-if="profileOpen && user" v-model:open="profileOpen" />
</template>
