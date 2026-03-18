/**
 * 文件处理器
 * 参考 Python 项目 src/core/file_handler.py
 * 
 * 处理 QQ 消息中的文件下载
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileInfo } from './parser';
import { getNapCatClient } from '../napcat/client';

export interface FileHandlerConfig {
  downloadDir: string;           // 下载目录
  autoDownload: boolean;         // 是否自动下载
  maxFileSize: number;           // 最大文件大小（字节）
  continueOnFail: boolean;       // 下载失败时是否继续
  fileMessagePrefix: string;     // 文件消息前缀
}

const DEFAULT_CONFIG: FileHandlerConfig = {
  downloadDir: 'data/downloads',
  autoDownload: true,
  maxFileSize: 500 * 1024 * 1024, // 500MB
  continueOnFail: true,
  fileMessagePrefix: '用户发送了一个文件，文件路径：',
};

class FileHandler {
  private config: FileHandlerConfig;
  private napcatTempDir: string;

  constructor(config: Partial<FileHandlerConfig> = {}) {
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
  private ensureDownloadDir(): void {
    if (!fs.existsSync(this.config.downloadDir)) {
      fs.mkdirSync(this.config.downloadDir, { recursive: true });
    }
  }

  /**
   * 处理文件消息，返回要发送给 AI 的文本
   */
  async processFileMessage(
    fileInfoList: FileInfo[],
    userId: number,
    groupId?: number
  ): Promise<string[]> {
    if (!this.config.autoDownload || fileInfoList.length === 0) {
      return fileInfoList.map(f => this.formatFileInfo(f, false));
    }

    const results: string[] = [];

    for (const fileInfo of fileInfoList) {
      try {
        const localPath = await this.downloadFile(fileInfo, userId);
        
        if (localPath) {
          results.push(`${this.config.fileMessagePrefix}${localPath}`);
        } else if (this.config.continueOnFail) {
          results.push(this.formatFileInfo(fileInfo, false) + ' [下载失败]');
        }
      } catch (error: any) {
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
  async downloadFile(fileInfo: FileInfo, userId: number): Promise<string | null> {
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
      if (result) return result;
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
          if (result) return result;
        }
        
        // 如果有 URL，尝试下载
        if (fileData?.url) {
          const result = await this.downloadFromUrl(fileData.url, savePath);
          if (result) return result;
        }
      } catch (error: any) {}
    }

    // 方法3: 从 NapCat 临时目录查找
    const result = await this.findInTempDir(filename, savePath);
    if (result) return result;

    return null;
  }

  /**
   * 从 URL 下载文件
   */
  private async downloadFromUrl(url: string, savePath: string): Promise<string | null> {
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
    } catch (error: any) {
      return null;
    }
  }

  /**
   * 从本地路径复制文件
   */
  private async copyFromPath(sourcePath: string, savePath: string): Promise<string | null> {
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
    } catch (error: any) {
      return null;
    }
  }

  /**
   * 从 NapCat 临时目录查找文件
   */
  private async findInTempDir(filename: string, savePath: string): Promise<string | null> {
    if (!fs.existsSync(this.napcatTempDir)) {
      return null;
    }

    // 等待文件下载完成
    await this.sleep(2000);

    const files = fs.readdirSync(this.napcatTempDir);
    const filenameBase = path.parse(filename).name.toLowerCase();
    
    // 查找最匹配的文件
    let bestMatch: string | null = null;
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
      } catch (error: any) {}
    }

    return null;
  }

  /**
   * 格式化文件信息
   */
  private formatFileInfo(fileInfo: FileInfo, downloaded: boolean): string {
    const { type, filename, fileId, url } = fileInfo;
    
    const typeNames: Record<string, string> = {
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
  private sanitizeFilename(filename: string): string {
    return filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
  }

  /**
   * 获取唯一路径（避免文件名冲突）
   */
  private getUniquePath(filePath: string): string {
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
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例实例
let fileHandlerInstance: FileHandler | null = null;

export function getFileHandler(config?: Partial<FileHandlerConfig>): FileHandler {
  if (!fileHandlerInstance) {
    fileHandlerInstance = new FileHandler(config);
  }
  return fileHandlerInstance;
}

export { FileHandler };