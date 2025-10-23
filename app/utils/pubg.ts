export const pubgApi = async (url: string) => {
  try {
    // 프록시를 통해 /api 경로로 요청
    const config = useRuntimeConfig();
    const apiUrl =
      config.public.apiUrl || process.env.API_URL || 'http://localhost:3001';
    const response = await $fetch(`${apiUrl}${url}`);
    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
};
