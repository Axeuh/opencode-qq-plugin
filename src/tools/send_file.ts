/**
 * 自定义工具 - qq_send_file
 * 发送文件到 QQ 私聊或群聊
 */

import { tool, ToolDefinition } from '@opencode-ai/plugin';
import { getNapCatClient } from '../napcat/client';
import fs from 'fs';
import path from 'path';

export const qqSendFileTool: ToolDefinition = tool({
  description: '发送文件到 QQ 私聊或群聊。支持发送图片、文档、视频等文件。',
  args: {
    messageType: tool.schema.enum(['private', 'group']).describe('消息类型：private 为私聊，group 为群聊'),
    targetId: tool.schema.string().describe('目标 ID：私聊时为 QQ 号，群聊时为群号'),
    filePath: tool.schema.string().describe('文件的绝对路径'),
    customName: tool.schema.string().optional().describe('自定义文件名（可选）'),
    useBase64: tool.schema.boolean().optional().default(true).describe('是否使用 base64 编码（推荐，适合小文件）'),
  },
  async execute(args, context) {
    const napcat = getNapCatClient();

    try {
      // 检查文件是否存在
      if (!fs.existsSync(args.filePath)) {
        return JSON.stringify({
          success: false,
          error: `文件不存在: ${args.filePath}`,
        }, null, 2);
      }

      // 获取文件名
      const fileName = args.customName || path.basename(args.filePath);

      // 构建文件参数
      let fileParam: string;
      if (args.useBase64 !== false) {
        // 使用 base64 编码
        const fileBuffer = fs.readFileSync(args.filePath);
        const base64 = fileBuffer.toString('base64');
        const ext = path.extname(args.filePath).toLowerCase();
        fileParam = `base64://${base64}`;
      } else {
        // 使用 file:// 协议
        fileParam = `file:///${args.filePath.replace(/\\/g, '/')}`;
      }

      let result: any;
      if (args.messageType === 'private') {
        result = await napcat.sendPrivateFile(
          parseInt(args.targetId),
          fileParam,
          fileName
        );
      } else {
        result = await napcat.sendGroupFile(
          parseInt(args.targetId),
          fileParam,
          fileName
        );
      }

      return JSON.stringify({
        success: true,
        type: args.messageType,
        targetId: args.targetId,
        fileName: fileName,
        filePath: args.filePath,
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }, null, 2);
    }
  },
});