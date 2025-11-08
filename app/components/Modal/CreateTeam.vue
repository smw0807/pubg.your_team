<script setup lang="ts">
import useTeam from '~/composables/useTeam';
import {
  createGameTypeOptions,
  createGameModeOptions,
  createTierOptions,
  platformOptions,
} from '~/constants/options';
import type { CreateTeam, Team } from '~/models/team';

const { createTeam } = useTeam();
const { openAlert } = useAlert();
const { user } = useAuth();

const open = ref(false);

// 폼 데이터
const formData = ref<CreateTeam>({
  title: '',
  description: '',
  mode: 'squad',
  tier: null,
  damage: null,
  platform: 'kakao',
  isRanked: true,
  members: [],
});

// 게임 타입 선택을 위한 별도 상태
const selectedGameType = ref('ranked');

// 폼 제출
const handleSubmit = async () => {
  try {
    const teamData: Team = {
      ...formData.value,
      isRanked: selectedGameType.value === 'ranked',
      createdAt: new Date(),
    };
    await createTeam(teamData);
  } catch (error) {
    console.error('팀 생성 실패:', error);
  }
};

const handleOpen = (value: boolean) => {
  if (!user.value) {
    openAlert('로그인', '로그인 후 팀 생성이 가능합니다.');
    return;
  }
  open.value = value;
  if (value) {
    resetForm();
  }
};

const resetForm = () => {
  selectedGameType.value = 'ranked';
  formData.value.platform = 'kakao';
  formData.value.isRanked = true;
  formData.value.members = [];
  formData.value.damage = null;
  formData.value.tier = null;
  formData.value.description = '';
  formData.value.title = '';
};
</script>

<template>
  <UModal
    title="팀 생성"
    description="새로운 팀을 만들어보세요"
    :dismissible="false"
    :open="open"
    style="z-index: 99999"
    @update:open="handleOpen"
    @close="open = false"
  >
    <UButton color="primary" size="lg">팀 만들기</UButton>
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1.5"> 플랫폼 * </label>
            <USelect
              v-model="formData.platform"
              :items="platformOptions"
              option-attribute="label"
              value-attribute="value"
              placeholder="플랫폼"
              size="md"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">
              게임 타입 *
            </label>
            <USelect
              v-model="selectedGameType"
              :items="createGameTypeOptions"
              option-attribute="label"
              value-attribute="value"
              placeholder="타입"
              size="md"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">
              게임 모드 *
            </label>
            <USelect
              v-model="formData.mode"
              :items="createGameModeOptions"
              option-attribute="label"
              value-attribute="value"
              placeholder="게임 모드를 선택하세요"
              size="md"
            />
          </div>
        </div>
        <!-- 팀 제목 -->
        <div>
          <label class="block text-sm font-medium mb-1.5"> 팀 제목 * </label>
          <UInput
            v-model="formData.title"
            placeholder="팀 제목을 입력하세요"
            size="md"
            class="w-full"
          />
        </div>

        <!-- 팀 설명 -->
        <div>
          <label class="block text-sm font-medium mb-1.5"> 팀 설명 </label>
          <UTextarea
            v-model="formData.description"
            placeholder="팀에 대한 설명을 입력하세요"
            :rows="2"
            size="xl"
            class="w-full"
          />
        </div>

        <!-- 티어와 데미지 그룹 -->
        <div class="grid grid-cols-2 gap-3">
          <!-- 티어 -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              원하는 티어
            </label>
            <USelect
              v-model="formData.tier"
              :items="createTierOptions"
              option-attribute="label"
              value-attribute="value"
              placeholder="티어"
              size="md"
              class="w-full"
            />
          </div>

          <!-- 데미지 -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              최소 데미지
            </label>
            <UInput
              v-model.number="formData.damage"
              type="number"
              placeholder="0"
              min="0"
              size="md"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          :disabled="!formData.title || !formData.platform"
          color="primary"
          size="sm"
          @click="handleSubmit"
        >
          팀 생성
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          @click="open = false"
        >
          취소
        </UButton>
      </div>
    </template>
  </UModal>
</template>
