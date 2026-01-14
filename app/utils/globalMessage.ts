import type { MessageOptions } from "naive-ui";
import { message as discreteMessage } from "~/utils/naive";

type MessageType = "info" | "success" | "warning" | "error" | "loading";

interface QueueItem {
  type: MessageType;
  content: string;
  options?: MessageOptions;
}

const queue: QueueItem[] = [];
let running = false;

function next() {
  if (running) return;
  const item = queue.shift();
  if (!item) return;
  running = true;
  const duration = item.options?.duration ?? 3000;
  try {
    discreteMessage.destroyAll();
    // @ts-ignore
    const inst = discreteMessage[item.type](item.content, item.options);
    setTimeout(
      () => {
        try {
          // @ts-ignore
          inst?.destroy?.();
        } catch {}
        running = false;
        next();
      },
      Math.max(0, duration + 100)
    );
  } catch {
    running = false;
    next();
  }
}

function enqueue(type: MessageType, content: string, options?: MessageOptions) {
  queue.push({ type, content, options });
  next();
}

export const globalMessage = {
  info(content: string, options?: MessageOptions) {
    enqueue("info", content, options);
  },
  success(content: string, options?: MessageOptions) {
    enqueue("success", content, options);
  },
  warning(content: string, options?: MessageOptions) {
    enqueue("warning", content, options);
  },
  error(content: string, options?: MessageOptions) {
    enqueue("error", content, options);
  },
  loading(content: string, options?: MessageOptions) {
    enqueue("loading", content, options);
  },
  destroyAll() {
    // 清理队列与当前消息
    queue.splice(0, queue.length);
    try {
      discreteMessage.destroyAll();
    } catch {}
    running = false;
  },
};
