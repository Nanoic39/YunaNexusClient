import { createDiscreteApi } from "naive-ui";
import type { MessageApi } from "naive-ui";

export let message: MessageApi = {
  create: () => ({}) as any,
  info: () => ({}) as any,
  success: () => ({}) as any,
  warning: () => ({}) as any,
  error: () => ({}) as any,
  loading: () => ({}) as any,
  destroyAll: () => {},
};

if (process.client) {
  const { message: m } = createDiscreteApi(["message"]);
  message = m;
}
