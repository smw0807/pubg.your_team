// 전역 상태를 위한 싱글톤 인스턴스
const globalConfirmState = {
  confirmOpen: ref(false),
  confirmTitle: ref('Confirm'),
  confirmDescription: ref('Confirm Description'),
  confirmCallback: ref<(() => void) | null>(null),
};

export default function useConfirm() {
  const confirmOpen = globalConfirmState.confirmOpen;
  const confirmTitle = globalConfirmState.confirmTitle;
  const confirmDescription = globalConfirmState.confirmDescription;
  const confirmCallback = globalConfirmState.confirmCallback;
  const getConfirmOpen = computed(() => confirmOpen.value);

  const openConfirm = (
    title: string,
    description?: string,
    callback?: () => void
  ) => {
    confirmOpen.value = true;
    confirmTitle.value = title;
    confirmDescription.value = description || '';
    confirmCallback.value = callback || null;
  };

  const closeConfirm = () => {
    confirmOpen.value = false;
    confirmCallback.value = null;
  };

  const handleConfirm = () => {
    if (confirmCallback.value) {
      confirmCallback.value();
    }
    closeConfirm();
  };

  return {
    confirmOpen,
    getConfirmOpen,
    confirmTitle,
    confirmDescription,
    openConfirm,
    closeConfirm,
    handleConfirm,
  };
}
