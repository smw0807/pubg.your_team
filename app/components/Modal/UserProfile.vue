<script setup lang="ts">
import { responsiveModalUi } from '~/constants/modal';
import UserStat from '~/components/Modal/UserStat.vue';
const open = defineModel<boolean>('open', { default: false });

const { profile, getProfile, setProfile } = useProfile();
const { openAlert } = useAlert();
const isSaving = ref(false);
const isLoading = ref(true);
const loadError = ref('');

const steamNickname = ref(profile.value?.steamNickname || '');
const kakaoNickname = ref(profile.value?.kakaoNickname || '');

const loadProfile = async () => {
  isLoading.value = true; loadError.value = '';
  try { await getProfile(); }
  catch { loadError.value = '닉네임 정보를 불러오지 못했습니다. 다시 시도해주세요.'; }
  finally { isLoading.value = false; }
};
onMounted(loadProfile);

const handleSave = async () => {
  if (isSaving.value || isLoading.value || loadError.value) return;
  isSaving.value = true;
  try {
    await setProfile(steamNickname.value, kakaoNickname.value);
    openAlert('저장 완료', '게임 닉네임이 저장되었습니다.');
  } catch (error) {
    openAlert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
  } finally {
    isSaving.value = false;
  }
};

watch(profile, () => {
  steamNickname.value = profile.value?.steamNickname || '';
  kakaoNickname.value = profile.value?.kakaoNickname || '';
});
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="responsiveModalUi"
    title="게임 닉네임 관리"
    description="팀찾기 기능을 이용하려면 현재 사용중인 스팀, 카카오 닉네임을 입력해주세요."
    :dismissible="false"
  >
    <template #body>
      <p v-if="isLoading" role="status">닉네임 정보를 불러오는 중입니다...</p>
      <div v-else-if="loadError" role="alert" class="space-y-3">
        <p>{{ loadError }}</p>
        <UButton variant="outline" @click="loadProfile">다시 시도</UButton>
      </div>
      <div v-else class="flex flex-col gap-4">
        <UFormField label="스팀 닉네임">
          <div class="flex gap-2">
            <UInput v-model="steamNickname" placeholder="스팀 닉네임을 입력해주세요." class="min-w-0 flex-1" />
            <UserStat platform="steam" :nickname="steamNickname" />
          </div>
        </UFormField>
        <UFormField label="카카오 닉네임">
          <div class="flex gap-2">
            <UInput v-model="kakaoNickname" placeholder="카카오 닉네임을 입력해주세요." class="min-w-0 flex-1" />
            <UserStat platform="kakao" :nickname="kakaoNickname" />
          </div>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end">
        <UButton label="저장" :loading="isSaving" :disabled="isSaving || isLoading || !!loadError" color="info" variant="outline" @click="handleSave" />
      </div>
    </template>
  </UModal>
</template>
