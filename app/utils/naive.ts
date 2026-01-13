import { createDiscreteApi } from "naive-ui";
import type {
  MessageApi,
  DialogApi,
  NotificationApi,
  LoadingBarApi,
} from "naive-ui";

export let message: MessageApi = {
  create: () => ({}) as any,
  info: () => ({}) as any,
  success: () => ({}) as any,
  warning: () => ({}) as any,
  error: () => ({}) as any,
  loading: () => ({}) as any,
  destroyAll: () => {},
};

export let dialog: DialogApi = {
  create: () => ({}) as any,
  success: () => ({}) as any,
  warning: () => ({}) as any,
  error: () => ({}) as any,
  info: () => ({}) as any,
  destroyAll: () => {},
};

export let notification: NotificationApi = {
  create: () => ({}) as any,
  info: () => ({}) as any,
  success: () => ({}) as any,
  warning: () => ({}) as any,
  error: () => ({}) as any,
  open: () => ({}) as any,
  destroyAll: () => {},
};

export let loadingBar: LoadingBarApi = {
  start: () => {},
  finish: () => {},
  error: () => {},
};

if (process.client) {
  const {
    message: m,
    dialog: d,
    notification: n,
    loadingBar: l,
  } = createDiscreteApi(["message", "dialog", "notification", "loadingBar"]);
  message = m;
  dialog = d;
  notification = n;
  loadingBar = l;
}
