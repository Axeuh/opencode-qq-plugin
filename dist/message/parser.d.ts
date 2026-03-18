/**
 * 消息段解析器
 * 参考 Python 项目 src/core/cq_code_parser.py
 *
 * 支持解析 OneBot v11 消息段格式和 CQ 码格式
 */
export interface ParsedCQCode {
    type: string;
    params: Record<string, string>;
}
export interface FileInfo {
    type: string;
    filename: string;
    fileId: string;
    fileSize: string;
    originalCQ: string;
    params: Record<string, string>;
    url?: string;
}
export interface MessageSegmentData {
    type: string;
    data: Record<string, any>;
}
/**
 * 解析单个 CQ 码
 * 示例: "[CQ:file,file=test.docx,file_id=abc123]" -> {type: "file", params: {file: "test.docx", file_id: "abc123"}}
 */
export declare function parseCQCode(cqCode: string): ParsedCQCode;
/**
 * 从原始消息中提取文件信息
 * 支持 CQ:file, CQ:image, CQ:voice, CQ:video 等
 */
export declare function extractFileInfo(rawMessage: string): FileInfo[];
/**
 * 从消息中提取引用消息 ID
 * 支持 OneBot 消息段格式和 CQ 码格式
 */
export declare function extractQuotedMessageId(message: any): string | null;
/**
 * 从原始消息中提取纯文本（去除 CQ 码）
 */
export declare function extractPlainText(rawMessage: string): string;
/**
 * 解析消息段数组（OneBot 格式）
 */
export declare function parseMessageSegments(segments: MessageSegmentData[]): {
    text: string;
    atList: string[];
    fileInfo: FileInfo[];
    replyId: string | null;
};
/**
 * 构建给 AI 的消息上下文
 * 包含文本、文件信息、引用消息等
 */
export declare function buildMessageContext(options: {
    text: string;
    senderName: string;
    senderId: number;
    messageType: 'private' | 'group';
    groupId?: number;
    fileInfo?: FileInfo[];
    replyContent?: string;
}): string;
//# sourceMappingURL=parser.d.ts.map