// 전역 상태를 위한 싱글톤 인스턴스
const globalConfirmState = {
  confirmOpen: ref(false),
  confirmTitle: ref('확인'),
  confirmDescription: ref(''),
  confirmCallback: ref<(() => void | Promise<void>) | null>(null),
  confirmPending: ref(false),
  confirmError: ref(''),
};

export default function useConfirm() {
  const confirmOpen = globalConfirmState.confirmOpen;
  const confirmTitle = globalConfirmState.confirmTitle;
  const confirmDescription = globalConfirmState.confirmDescription;
  const confirmCallback = globalConfirmState.confirmCallback;

  const openConfirm = (
    title: string,
    description?: string,
    callback?: () => void | Promise<void>
  ) => {
    if (globalConfirmState.confirmPending.value) return;
    globalConfirmState.confirmError.value = '';
    confirmOpen.value = true;
    confirmTitle.value = title;
    confirmDescription.value = description || '';
    confirmCallback.value = callback || null;
  };

  const closeConfirm = () => {
    if (globalConfirmState.confirmPending.value) return;
    confirmOpen.value = false;
    confirmCallback.value = null;
  };

  const handleConfirm = async () => {
    if (globalConfirmState.confirmPending.value) return;
    globalConfirmState.confirmPending.value = true;
    globalConfirmState.confirmError.value = '';
    try {
      await confirmCallback.value?.();
      confirmOpen.value = false;
      confirmCallback.value = null;
    } catch {
      globalConfirmState.confirmError.value = '완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.';
    } finally {
      globalConfirmState.confirmPending.value = false;
    }
  };

  return {
    confirmOpen,
    confirmTitle,
    confirmDescription,
    openConfirm,
    closeConfirm,
    handleConfirm,
    confirmPending: globalConfirmState.confirmPending,
    confirmError: globalConfirmState.confirmError,
  };
}
