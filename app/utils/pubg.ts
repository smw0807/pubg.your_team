export const pubgApi = async (url: string) => {
  try {
    // 프록시를 통해 /api 경로로 요청
    const response = await $fetch(`/api${url}`);
    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
};
