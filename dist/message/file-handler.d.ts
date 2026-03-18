/**
 * 文件处理器
 * 参考 Python 项目 src/core/file_handler.py
 *
 * 处理 QQ 消息中的文件下载
 */
import { FileInfo } from './parser';
export interface FileHandlerConfig {
    downloadDir: string;
    autoDownload: boolean;
    maxFileSize: number;
    continueOnFail: boolean;
    fileMessagePrefix: string;
}
declare class FileHandler {
    private config;
    private napcatTempDir;
    constructor(config?: Partial<FileHandlerConfig>);
    /**
     * 确保下载目录存在
     */
    private ensureDownloadDir;
    /**
     * 处理文件消息，返回要发送给 AI 的文本
     */
    processFileMessage(fileInfoList: FileInfo[], userId: number, groupId?: number): Promise<string[]>;
    /**
     * 下载文件到本地
     */
    downloadFile(fileInfo: FileInfo, userId: number): Promise<string | null>;
    /**
     * 从 URL 下载文件
     */
    private downloadFromUrl;
    /**
     * 从本地路径复制文件
     */
    private copyFromPath;
    /**
     * 从 NapCat 临时目录查找文件
     */
    private findInTempDir;
    /**
     * 格式化文件信息
     */
    private formatFileInfo;
    /**
     * 清理文件名中的非法字符
     */
    private sanitizeFilename;
    /**
     * 获取唯一路径（避免文件名冲突）
     */
    private getUniquePath;
    /**
     * 延迟
     */
    private sleep;
}
export declare function getFileHandler(config?: Partial<FileHandlerConfig>): FileHandler;
export { FileHandler };
//# sourceMappingURL=file-handler.d.ts.map