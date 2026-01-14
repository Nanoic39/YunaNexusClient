import { ref, reactive } from "vue";
import { useFileApi } from "./api/useFileApi";
import { globalMessage as message } from "~/utils/globalMessage";

export interface UploadProgress {
  uuid: string; // 临时UUID，用于区分任务
  file: File;
  progress: number;
  status: "pending" | "uploading" | "merging" | "completed" | "error";
  error?: string;
}

const uploadTasks = ref<UploadProgress[]>([]);

export const useChunkUpload = () => {
  const { initChunkUpload, uploadChunk, mergeChunks, getChunkConfig } =
    useFileApi();
  const message = useMessage();

  const processQueue = async (
    queue: (() => Promise<any>)[],
    concurrency: number,
    onProgress: () => void
  ) => {
    let active = 0;
    const results: any[] = [];
    const executing: Promise<any>[] = [];

    for (const task of queue) {
      while (active >= concurrency) {
        await Promise.race(executing);
      }
      active++;
      const p = task()
        .then((res) => {
          active--;
          executing.splice(executing.indexOf(p), 1);
          onProgress();
          return res;
        })
        .catch((err) => {
          active--;
          executing.splice(executing.indexOf(p), 1);
          throw err;
        });
      executing.push(p);
      results.push(p);
    }
    return Promise.all(results);
  };

  const upload = async (
    file: File,
    folderId?: number,
    onFinish?: () => void
  ) => {
    const task = reactive<UploadProgress>({
      uuid: crypto.randomUUID(),
      file,
      progress: 0,
      status: "pending",
    });
    uploadTasks.value.push(task);

    try {
      // 1. 获取配置
      const { data: config } = await getChunkConfig();
      const CHUNK_SIZE = config?.chunkSize || 25 * 1024 * 1024;
      const CONCURRENCY = config?.concurrency || 5; // 默认5，后端会返回50或200

      task.status = "uploading";
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // 2. 初始化
      const { data: uploadId } = await initChunkUpload(
        file.name,
        totalChunks,
        file.size
      );
      if (!uploadId) throw new Error("初始化上传失败");

      // 3. 构建分片任务
      const chunkTasks = [];
      let completedChunks = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);

        chunkTasks.push(async () => {
          await uploadChunk(uploadId, i, blob);
          completedChunks++;
          task.progress = Math.floor((completedChunks / totalChunks) * 90); // 上传占90%进度
        });
      }

      // 4. 并发上传
      await processQueue(chunkTasks, CONCURRENCY, () => {});

      // 5. 合并
      task.status = "merging";
      task.progress = 95;
      await mergeChunks(uploadId, file.name, folderId);

      task.progress = 100;
      task.status = "completed";
      message.success(`${file.name} 上传成功`);
      if (onFinish) onFinish();
    } catch (e: any) {
      console.error(e);
      task.status = "error";
      task.error = e.message || "上传失败";
      message.error(`${file.name} 上传失败: ${e.message}`);
    }
  };

  return {
    upload,
    uploadTasks,
  };
};
