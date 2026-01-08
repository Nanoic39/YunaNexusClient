export default defineNuxtPlugin(async (nuxtApp) => {
  const userStore = useUserStore();
  await userStore.init();
});
