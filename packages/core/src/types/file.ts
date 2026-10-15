/** 文件元数据视图（不含存储路径等内部信息） */
export interface FileView {
  fileId: number
  fileName: string
  ext: string | null
  contentType: string | null
  size: number
  sha256: string | null
  createBy: number | null
  deptId: number | null
  createTime: string | null
}

/** 分片上传初始化结果 */
export interface ChunkInitResult {
  uploadId: string
  /** 已上传的分片序号，用于断点续传 */
  uploadedChunks: number[]
}
