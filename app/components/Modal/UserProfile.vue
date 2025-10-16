<script setup lang="ts">
import UserStat from '~/components/Modal/UserStat.vue';

const { profile, setProfile } = useProfile();

const steamNickname = ref(profile?.value?.steamNickname || '');
const kakaoNickname = ref(profile?.value?.kakaoNickname || '');

const handleSave = async () => {
  await setProfile(steamNickname.value, kakaoNickname.value);
};

watch(profile, () => {
  steamNickname.value = profile?.value?.steamNickname || '';
  kakaoNickname.value = profile?.value?.kakaoNickname || '';
});
</script>

<template>
  <UModal
    title="게임 닉네임 관리"
    description="팀찾기 기능을 이용하려면 현재 사용중인 스팀, 카카오 닉네임을 입력해주세요."
    :dismissible="false"
  >
    <UButton color="info" variant="ghost">
      <UIcon name="i-heroicons-user-circle" class="w-6 h-6" />
    </UButton>

    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="스팀 닉네임">
          <div class="flex gap-2">
            <UInput
              v-model="steamNickname"
              placeholder="스팀 닉네임을 입력해주세요."
              class="w-full"
            />
            <UserStat platform="steam" :nickname="steamNickname" />
          </div>
        </UFormField>
        <UFormField label="카카오 닉네임">
          <div class="flex gap-2">
            <UInput
              v-model="kakaoNickname"
              placeholder="카카오 닉네임을 입력해주세요."
              class="w-full"
            />
            <UserStat platform="kakao" :nickname="kakaoNickname" />
          </div>
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <UButton
          label="저장"
          color="info"
          variant="outline"
          @click="handleSave"
        />
      </div>
    </template>
  </UModal>
</template>
