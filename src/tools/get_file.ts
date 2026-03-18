/**
 * 自定义工具 - qq_get_file
 * 获取文件信息
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { getNapCatClient } from '../napcat/client';

export const qqGetFileTool: ToolDefinition = tool({
  description: '获取 QQ 文件信息，包括文件名、大小和下载链接。',
  args: {
    fileId: tool.schema.string().optional().describe('文件 ID'),
    file: tool.schema.string().optional().describe('文件路径或 URL'),
  },
  async execute(args, context) {
    const napcat = getNapCatClient();

    try {
      if (!args.fileId && !args.file) {
        return JSON.stringify({
          success: false,
          error: '必须提供 fileId 或 file 参数',
        }, null, 2);
      }

      const result = await napcat.getFile(args.fileId, args.file);

      return JSON.stringify({
        success: true,
        file: result,
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }, null, 2);
    }
  },
});