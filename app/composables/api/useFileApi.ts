import { useHttp } from "~/composables/useHttp";
import { API_PREFIX } from "./constants";

export interface FileMeta {
  id: number;
  uuid: string;
  userId: number;
  folderId: number;
  originName: string;
  fileName: string;
  filePath: string;
  storageType: number;
  fileSize: number;
  fileType: string;
  mimeType: string;
  identifier: string;
  category: number;
  isFolder: number;
  fileCount: number;
  subSize: number;
  createTime: string;
  updateTime: string;
  status: number;
  isShared?: boolean;
}

export interface FileUploadResult {
  uuid: string;
  originName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageType: number;
  category: number;
}

export interface ShareResult {
  shareToken: string;
  fileUuid: string;
  permissionType: number;
  downloadLimit: number;
  downloadCount: number;
  expireTime: string;
  needPwd: boolean;
  fileName?: string;
  status?: number;
}

export const useFileApi = () => {
  /**
   * 上传文件
   * @param file 文件对象
   * @param folderId 文件夹ID (可选)
   * @param category 分类 (0:私有, 1:公开)
   */
  const uploadFile = async (file: File, folderId?: number, category: number = 0) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId !== undefined) {
      formData.append("folderId", folderId.toString());
    }
    formData.append("category", category.toString());

    return useHttp<{
      code: number;
      msg: string;
      data: FileUploadResult;
    }>(`${API_PREFIX.FILE}/file/upload`, {
      method: "POST",
      body: formData,
      timeout: 60000, // 上传可能较慢
    });
  };

  /**
   * 获取我的文件列表
   * @param limit 限制数量
   */
  const getMyFiles = async (limit: number = 50) => {
    return useHttp<{
      code: number;
      msg: string;
      data: FileMeta[];
    }>(`${API_PREFIX.FILE}/file/my`, {
      method: "GET",
      params: { limit },
    });
  };

  /**
   * 删除文件
   * @param uuid 文件UUID
   */
  const deleteFile = async (uuid: string) => {
    return useHttp<{
      code: number;
      msg: string;
      data: null;
    }>(`${API_PREFIX.FILE}/file/${uuid}`, {
      method: "DELETE",
    });
  };

  const getRecycleBinFiles = async (limit: number = 50) => {
    return useHttp<{
      code: number;
      msg: string;
      data: FileMeta[];
    }>(`${API_PREFIX.FILE}/file/recycle/list`, {
      method: "GET",
    });
  };

  const recoverFile = async (uuid: string) => {
    return useHttp<{
      code: number;
      msg: string;
      data: null;
    }>(`${API_PREFIX.FILE}/file/recycle/recover/${uuid}`, {
      method: "POST",
    });
  };

  const cleanFile = async (uuid: string) => {
    return useHttp<{
      code: number;
      msg: string;
      data: null;
    }>(`${API_PREFIX.FILE}/file/recycle/clean/${uuid}`, {
      method: "DELETE",
    });
  };

  /**
   * 重命名文件
   * @param uuid 文件UUID
   * @param name 新文件名
   */
  const renameFile = async (uuid: string, name: string) => {
    const formData = new FormData();
    formData.append("name", name);
    return useHttp<{
      code: number;
      msg: string;
      data: null;
    }>(`${API_PREFIX.FILE}/file/rename/${uuid}`, {
      method: "POST",
      body: formData,
    });
  };

  /**
   * 创建分享
   * @param fileUuid 文件UUID
   * @param expireDays 有效期(天) (可选)
   * @param pwd 提取码 (可选)
   * @param downloadLimit 下载次数限制 (可选)
   * @param permissionType 权限类型 (可选)
   */
  const createShare = async (fileUuid: string, expireDays?: number, pwd?: string, downloadLimit?: number, permissionType?: number) => {
    return useHttp<{
      code: number;
      msg: string;
      data: ShareResult;
    }>(`${API_PREFIX.FILE}/share/create`, {
      method: "POST",
      body: {
        fileUuid,
        sharePwd: pwd,
        expireSeconds: expireDays ? expireDays * 86400 : 0,
        permissionType: permissionType ?? 1,
        downloadLimit: downloadLimit ?? 0
      },
    });
  };

  const updateShareStatus = async (token: string, status: number) => {
    return useHttp<{
      code: number;
      msg: string;
    }>(`${API_PREFIX.FILE}/share/update-status`, {
      method: "POST",
      params: { token, status }
    });
  };

  const deleteShare = async (token: string) => {
    return useHttp<{
      code: number;
      msg: string;
    }>(`${API_PREFIX.FILE}/share/delete/${token}`, {
      method: "POST",
    });
  };

  /**
   * 获取文件元数据
   * @param uuid 文件UUID
   */
  const getFileMeta = async (uuid: string) => {
    return useHttp<{
      code: number;
      msg: string;
      data: FileMeta;
    }>(`${API_PREFIX.FILE}/file/meta/${uuid}`, {
      method: "GET",
    });
  };

  const getDownloadUrl = (uuid: string, token?: string, inline: boolean = false) => {
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase;
    let url = `${apiBase}${API_PREFIX.FILE}/file/download/${uuid}`;
    const params: string[] = [];
    if (token) {
      params.push(`token=${token}`);
    }
    if (inline) {
      params.push(`inline=true`);
    }
    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }
    return url;
  };

  const createFolder = async (name: string, parentId?: number) => {
    const formData = new FormData();
    formData.append("name", name);
    if (parentId !== undefined) {
      formData.append("parentId", parentId.toString());
    }
    return useHttp<{ code: number; msg: string; data: null }>(`${API_PREFIX.FILE}/file/folder`, {
      method: "POST",
      body: formData,
    });
  };

  const moveFile = async (uuid: string, targetFolderId?: number) => {
    const formData = new FormData();
    if (targetFolderId !== undefined) {
      formData.append("targetFolderId", targetFolderId.toString());
    }
    return useHttp<{ code: number; msg: string; data: null }>(`${API_PREFIX.FILE}/file/move/${uuid}`, {
      method: "POST",
      body: formData,
    });
  };

  const getFileList = async (folderId?: number) => {
    const params: any = {};
    if (folderId !== undefined) {
      params.folderId = folderId;
    }
    return useHttp<{ code: number; msg: string; data: FileMeta[] }>(`${API_PREFIX.FILE}/file/list`, {
      method: "GET",
      params,
    });
  };

  const getDownloadToken = async (uuid: string) => {
    return useHttp<{ code: number; msg: string; data: string }>(`${API_PREFIX.FILE}/file/download-token/${uuid}`, {
      method: "GET",
    });
  };

  /**
   * 取消分享
   * @param fileUuid 文件UUID
   */
  const cancelShare = async (fileUuid: string) => {
    return useHttp<{ code: number; msg: string; data: null }>(`${API_PREFIX.FILE}/share/cancel/${fileUuid}`, {
      method: "POST",
    });
  };

  /**
   * 初始化分片上传
   */
  const initChunkUpload = async (filename: string, totalChunks: number, totalSize: number, identifier?: string) => {
    return useHttp<{ code: number; msg: string; data: string }>(`${API_PREFIX.FILE}/file/chunk/init`, {
      method: "POST",
      params: { filename, totalChunks, totalSize, identifier },
    });
  };

  /**
   * 上传分片
   */
  const uploadChunk = async (uploadId: string, chunkNumber: number, file: Blob) => {
    const formData = new FormData();
    formData.append("uploadId", uploadId);
    formData.append("chunkNumber", chunkNumber.toString());
    formData.append("file", file);
    return useHttp<{ code: number; msg: string; data: null }>(`${API_PREFIX.FILE}/file/chunk/upload`, {
      method: "POST",
      body: formData,
      timeout: 120000, // 分片上传超时时间
    });
  };

  /**
   * 合并分片
   */
  const mergeChunks = async (uploadId: string, filename: string, folderId?: number) => {
    return useHttp<{ code: number; msg: string; data: FileUploadResult }>(`${API_PREFIX.FILE}/file/chunk/merge`, {
      method: "POST",
      params: { uploadId, filename, folderId },
    });
  };

  /**
   * 获取分片配置
   */
  const getChunkConfig = async () => {
    return useHttp<{ code: number; msg: string; data: { concurrency: number; chunkSize: number } }>(`${API_PREFIX.FILE}/file/chunk/config`, {
      method: "GET",
    });
  };

  const getMyShares = async () => {
    return useHttp<{
      code: number;
      msg: string;
      data: ShareResult[];
    }>(`${API_PREFIX.FILE}/share/my`, {
      method: "GET",
    });
  };

  const getShareInfo = async (token: string) => {
    return useHttp<{
      code: number;
      msg: string;
      data: ShareResult;
    }>(`${API_PREFIX.FILE}/share/${token}`, {
      method: "GET",
    });
  };

  const getShareFileMeta = async (token: string, pwd?: string) => {
    return useHttp<{
      code: number;
      msg: string;
      data: FileMeta;
    }>(`${API_PREFIX.FILE}/share/${token}/meta`, {
      method: "GET",
      params: { pwd },
    });
  };

  const getShareDownloadUrl = (token: string, pwd?: string, inline: boolean = false) => {
      const config = useRuntimeConfig();
      const apiBase = config.public.apiBase;
      let url = `${apiBase}${API_PREFIX.FILE}/share/${token}/download`;
      const params = new URLSearchParams();
      if (pwd) params.append("pwd", pwd);
      if (inline) params.append("inline", "true");
      
      const queryString = params.toString();
      if (queryString) {
          url += `?${queryString}`;
      }
      return url;
  }

  const constructShareLink = (shareToken: string) => {
    // Return frontend link
    if (import.meta.client) {
      return `${window.location.origin}/share?token=${shareToken}`;
    }
    // Fallback for SSR (though this is usually client side)
    return `/share?token=${shareToken}`;
  };

  return {
    uploadFile,
    getMyFiles,
    deleteFile,
    createShare,
    getFileMeta,
    renameFile,
    getFileList,
    createFolder,
    moveFile,
    getDownloadUrl,
    getDownloadToken,
    cancelShare,
    initChunkUpload,
    uploadChunk,
    mergeChunks,
    getChunkConfig,
    getMyShares,
    constructShareLink,
    getShareInfo,
    getShareFileMeta,
    getShareDownloadUrl,
    updateShareStatus,
    deleteShare,
    getRecycleBinFiles,
    recoverFile,
    cleanFile,
  };
};
