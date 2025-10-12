export const platformTextTransform = (platform: string) => {
  switch (platform) {
    case 'kakao':
      return '카카오';
    case 'steam':
      return '스팀';
    default:
      return platform;
  }
};

export const modeTextTransform = (mode: string) => {
  switch (mode) {
    case 'duo':
      return '듀오';
    case 'squad':
      return '스쿼드';
    default:
      return mode;
  }
};
