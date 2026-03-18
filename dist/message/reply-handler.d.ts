/**
 * 引用消息处理器
 * 参考 Python 项目 src/core/message_router.py
 *
 * 处理引用消息中的文本、文件、图片、合并转发等
 */
export interface ReplyContent {
    text: string;
    files: string[];
    rawMessage: string;
}
/**
 * 处理引用消息
 * @param replyId 引用消息 ID
 * @param userId 用户 QQ 号
 * @param groupId 群号（如果是群消息）
 * @param directory 工作目录
 * @returns 引用消息内容
 */
export declare function processReplyMessage(replyId: string, userId: number, groupId?: number, directory?: string): Promise<ReplyContent | null>;
/**
 * 格式化引用消息内容
 */
export declare function formatReplyContent(replyContent: ReplyContent): string;
//# sourceMappingURL=reply-handler.d.ts.map