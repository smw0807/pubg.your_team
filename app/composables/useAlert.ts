// 전역 상태를 위한 싱글톤 인스턴스
const globalAlertState = {
  alertOpen: ref(false),
  alertTitle: ref('알림'),
  alertDescription: ref(''),
};

export default function useAlert() {
  const alertOpen = globalAlertState.alertOpen;
  const alertTitle = globalAlertState.alertTitle;
  const alertDescription = globalAlertState.alertDescription;

  const openAlert = (title: string, description?: string) => {
    alertOpen.value = true;
    alertTitle.value = title;
    alertDescription.value = description || '';
  };

  const closeAlert = () => {
    alertOpen.value = false;
  };

  return {
    alertOpen,
    alertTitle,
    alertDescription,
    openAlert,
    closeAlert,
  };
}
