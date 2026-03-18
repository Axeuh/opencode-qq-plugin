/**
 * 文件处理器
 * 参考 Python 项目 src/core/file_handler.py
 *
 * 处理 QQ 消息中的文件下载
 */
import * as fs from 'fs';
import * as path from 'path';
import { getNapCatClient } from '../napcat/client';
const DEFAULT_CONFIG = {
    downloadDir: 'data/downloads',
    autoDownload: true,
    maxFileSize: 500 * 1024 * 1024, // 500MB
    continueOnFail: true,
    fileMessagePrefix: '用户发送了一个文件，文件路径：',
};
class FileHandler {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.napcatTempDir = process.platform === 'win32'
            ? 'C:\\Users\\Administrator\\Documents\\Tencent Files\\NapCat\\temp'
            : '/tmp/napcat/temp';
        // 确保下载目录存在
        this.ensureDownloadDir();
    }
    /**
     * 确保下载目录存在
     */
    ensureDownloadDir() {
        if (!fs.existsSync(this.config.downloadDir)) {
            fs.mkdirSync(this.config.downloadDir, { recursive: true });
        }
    }
    /**
     * 处理文件消息，返回要发送给 AI 的文本
     */
    async processFileMessage(fileInfoList, userId, groupId) {
        if (!this.config.autoDownload || fileInfoList.length === 0) {
            return fileInfoList.map(f => this.formatFileInfo(f, false));
        }
        const results = [];
        for (const fileInfo of fileInfoList) {
            try {
                const localPath = await this.downloadFile(fileInfo, userId);
                if (localPath) {
                    results.push(`${this.config.fileMessagePrefix}${localPath}`);
                }
                else if (this.config.continueOnFail) {
                    results.push(this.formatFileInfo(fileInfo, false) + ' [下载失败]');
                }
            }
            catch (error) {
                if (this.config.continueOnFail) {
                    results.push(this.formatFileInfo(fileInfo, false) + ' [下载失败]');
                }
            }
        }
        return results;
    }
    /**
     * 下载文件到本地
     */
    async downloadFile(fileInfo, userId) {
        const { type, filename, fileId, url, params } = fileInfo;
        // 检查文件大小
        const fileSize = parseInt(params.file_size || '0');
        if (fileSize > this.config.maxFileSize) {
            return null;
        }
        // 创建用户目录
        const userDir = path.join(this.config.downloadDir, String(userId));
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        // 生成保存路径
        const safeFilename = this.sanitizeFilename(filename || `file_${Date.now()}`);
        let savePath = path.join(userDir, safeFilename);
        // 避免文件名冲突
        savePath = this.getUniquePath(savePath);
        // 方法1: 图片 URL 下载
        if (type === 'image' && url) {
            const result = await this.downloadFromUrl(url, savePath);
            if (result)
                return result;
        }
        // 方法2: 通过 NapCat API 获取文件信息
        if (fileId) {
            const napcat = getNapCatClient();
            try {
                const fileData = await napcat.getFile(fileId);
                const napcatPath = fileData?.file;
                if (napcatPath) {
                    // 尝试从路径复制文件
                    const result = await this.copyFromPath(napcatPath, savePath);
                    if (result)
                        return result;
                }
                // 如果有 URL，尝试下载
                if (fileData?.url) {
                    const result = await this.downloadFromUrl(fileData.url, savePath);
                    if (result)
                        return result;
                }
            }
            catch (error) { }
        }
        // 方法3: 从 NapCat 临时目录查找
        const result = await this.findInTempDir(filename, savePath);
        if (result)
            return result;
        return null;
    }
    /**
     * 从 URL 下载文件
     */
    async downloadFromUrl(url, savePath) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                return null;
            }
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(savePath, Buffer.from(buffer));
            if (fs.existsSync(savePath) && fs.statSync(savePath).size > 0) {
                return savePath;
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * 从本地路径复制文件
     */
    async copyFromPath(sourcePath, savePath) {
        try {
            // 处理 WSL 路径
            let windowsPath = sourcePath;
            if (sourcePath.startsWith('/')) {
                // WSL 路径转换为 Windows 网络路径
                windowsPath = path.join('\\\\172.27.213.195\\wsl-root', sourcePath.slice(1).replace(/\//g, '\\'));
            }
            if (!fs.existsSync(windowsPath)) {
                return null;
            }
            fs.copyFileSync(windowsPath, savePath);
            if (fs.existsSync(savePath) && fs.statSync(savePath).size > 0) {
                return savePath;
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * 从 NapCat 临时目录查找文件
     */
    async findInTempDir(filename, savePath) {
        if (!fs.existsSync(this.napcatTempDir)) {
            return null;
        }
        // 等待文件下载完成
        await this.sleep(2000);
        const files = fs.readdirSync(this.napcatTempDir);
        const filenameBase = path.parse(filename).name.toLowerCase();
        // 查找最匹配的文件
        let bestMatch = null;
        let bestScore = 0;
        for (const file of files) {
            const fileBase = path.parse(file).name.toLowerCase();
            const fileExt = path.extname(file).toLowerCase();
            const targetExt = path.extname(filename).toLowerCase();
            let score = 0;
            // 完整文件名匹配
            if (file.toLowerCase() === filename.toLowerCase()) {
                score = 100;
            }
            // 基本名匹配
            else if (fileBase === filenameBase) {
                score = 90;
            }
            // 前缀匹配
            else if (filenameBase.includes(fileBase) || fileBase.includes(filenameBase)) {
                score = 70;
            }
            // 扩展名匹配调整
            if (score > 0 && targetExt && fileExt) {
                score = fileExt === targetExt ? Math.min(100, Math.floor(score * 1.2)) : Math.floor(score * 0.3);
            }
            if (score > bestScore) {
                bestScore = score;
                bestMatch = file;
            }
        }
        if (bestMatch && bestScore >= 85) {
            const sourcePath = path.join(this.napcatTempDir, bestMatch);
            try {
                fs.copyFileSync(sourcePath, savePath);
                if (fs.existsSync(savePath) && fs.statSync(savePath).size > 0) {
                    return savePath;
                }
            }
            catch (error) { }
        }
        return null;
    }
    /**
     * 格式化文件信息
     */
    formatFileInfo(fileInfo, downloaded) {
        const { type, filename, fileId, url } = fileInfo;
        const typeNames = {
            image: '图片',
            file: '文件',
            video: '视频',
            record: '语音',
            forward: '合并转发',
            share: '分享链接',
        };
        const typeName = typeNames[type] || type;
        const info = downloaded ? `已下载: ${filename}` : `${filename}`;
        return `用户发送了一个${typeName}: ${info}`;
    }
    /**
     * 清理文件名中的非法字符
     */
    sanitizeFilename(filename) {
        return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
    }
    /**
     * 获取唯一路径（避免文件名冲突）
     */
    getUniquePath(filePath) {
        if (!fs.existsSync(filePath)) {
            return filePath;
        }
        const ext = path.extname(filePath);
        const base = filePath.slice(0, -ext.length || 0);
        let counter = 1;
        let newPath = `${base}_${counter}${ext}`;
        while (fs.existsSync(newPath)) {
            counter++;
            newPath = `${base}_${counter}${ext}`;
        }
        return newPath;
    }
    /**
     * 延迟
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
// 单例实例
let fileHandlerInstance = null;
export function getFileHandler(config) {
    if (!fileHandlerInstance) {
        fileHandlerInstance = new FileHandler(config);
    }
    return fileHandlerInstance;
}
export { FileHandler };
//# sourceMappingURL=file-handler.js.map