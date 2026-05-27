export const pubgApi = async (url: string) => {
  try {
    const response = await $fetch(`/api${url}`);
    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
};
