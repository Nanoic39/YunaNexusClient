export default defineNuxtPlugin(async (nuxtApp) => {
  const userStore = useUserStore();
  userStore.init();
});
