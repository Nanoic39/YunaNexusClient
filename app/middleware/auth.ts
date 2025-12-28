export default defineNuxtRouteMiddleware((to, from) => {
  const { isLoggedIn } = useUser();

  if (!isLoggedIn.value) {
    return navigateTo("/login");
  }
});
