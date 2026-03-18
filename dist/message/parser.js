/**
 * 消息段解析器
 * 参考 Python 项目 src/core/cq_code_parser.py
 *
 * 支持解析 OneBot v11 消息段格式和 CQ 码格式
 */
/**
 * 解析单个 CQ 码
 * 示例: "[CQ:file,file=test.docx,file_id=abc123]" -> {type: "file", params: {file: "test.docx", file_id: "abc123"}}
 */
export function parseCQCode(cqCode) {
    const result = { type: '', params: {} };
    if (!cqCode || !cqCode.startsWith('[CQ:') || !cqCode.endsWith(']')) {
        return result;
    }
    // 提取 CQ 码内容，去除方括号
    const content = cqCode.slice(4, -1); // 移除 "[CQ:" 和 "]"
    // 分割类型和参数
    const commaIndex = content.indexOf(',');
    if (commaIndex === -1) {
        result.type = content;
        return result;
    }
    result.type = content.slice(0, commaIndex);
    const paramsStr = content.slice(commaIndex + 1);
    // 解析参数（注意值中可能包含逗号）
    const paramParts = [];
    let currentPart = '';
    let inQuotes = false;
    for (const char of paramsStr) {
        if (char === '"') {
            inQuotes = !inQuotes;
        }
        else if (char === ',' && !inQuotes) {
            paramParts.push(currentPart);
            currentPart = '';
            continue;
        }
        currentPart += char;
    }
    if (currentPart) {
        paramParts.push(currentPart);
    }
    // 解析每个参数
    for (const param of paramParts) {
        const eqIndex = param.indexOf('=');
        if (eqIndex !== -1) {
            const key = param.slice(0, eqIndex).trim();
            let value = param.slice(eqIndex + 1).trim();
            // 去除引号
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            // 解码 HTML 实体
            value = decodeHTMLEntities(value);
            result.params[key] = value;
        }
    }
    return result;
}
/**
 * 解码 HTML 实体
 */
function decodeHTMLEntities(text) {
    const entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x': '',
    };
    let result = text;
    for (const [entity, char] of Object.entries(entities)) {
        if (entity === '&#x') {
            // 处理 &#xXX; 格式
            result = result.replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => {
                return String.fromCharCode(parseInt(hex, 16));
            });
        }
        else {
            result = result.split(entity).join(char);
        }
    }
    return result;
}
/**
 * 从原始消息中提取文件信息
 * 支持 CQ:file, CQ:image, CQ:voice, CQ:video 等
 */
export function extractFileInfo(rawMessage) {
    const fileInfoList = [];
    if (!rawMessage) {
        return fileInfoList;
    }
    // 查找所有 CQ 码
    const cqPattern = /\[CQ:[^\]]+\]/g;
    let match;
    while ((match = cqPattern.exec(rawMessage)) !== null) {
        const cqCode = match[0];
        const parsed = parseCQCode(cqCode);
        const mediaType = parsed.type;
        // 支持的媒体类型
        const supportedTypes = [
            'file', 'image', 'voice', 'video', 'record',
            'forward', 'share', 'contact', 'location'
        ];
        if (supportedTypes.includes(mediaType)) {
            // 获取文件名
            let filename = '';
            if (['file', 'image', 'voice', 'video', 'record'].includes(mediaType)) {
                filename = parsed.params.file || parsed.params.filename || parsed.params.name || '';
            }
            else if (mediaType === 'forward') {
                filename = `forward_${parsed.params.id || 'unknown'}`;
            }
            else if (mediaType === 'share') {
                filename = parsed.params.title || '分享链接';
            }
            else if (mediaType === 'contact') {
                filename = `contact_${parsed.params.type || 'unknown'}_${parsed.params.id || ''}`;
            }
            else if (mediaType === 'location') {
                filename = `location_${parsed.params.lat || ''}_${parsed.params.lon || ''}`;
            }
            fileInfoList.push({
                type: mediaType,
                filename,
                fileId: parsed.params.file_id || parsed.params.id || '',
                fileSize: parsed.params.file_size || '',
                originalCQ: cqCode,
                params: { ...parsed.params },
                url: parsed.params.url,
            });
        }
    }
    return fileInfoList;
}
/**
 * 从消息中提取引用消息 ID
 * 支持 OneBot 消息段格式和 CQ 码格式
 */
export function extractQuotedMessageId(message) {
    try {
        // 格式1: OneBot 消息段数组
        if (message.message && Array.isArray(message.message)) {
            for (const segment of message.message) {
                if (segment && segment.type === 'reply') {
                    return segment.data?.id || null;
                }
            }
        }
        // 格式2: raw_message 包含 CQ:reply
        if (message.raw_message) {
            const replyMatch = message.raw_message.match(/\[CQ:reply,id=([^\]]+)\]/);
            if (replyMatch) {
                return replyMatch[1];
            }
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
/**
 * 从原始消息中提取纯文本（去除 CQ 码）
 */
export function extractPlainText(rawMessage) {
    if (!rawMessage) {
        return '';
    }
    // 移除 CQ 码
    let plainText = rawMessage.replace(/\[CQ:[^\]]+\]/g, '');
    // 移除多余空格并去除首尾空格
    plainText = plainText.replace(/\s+/g, ' ').trim();
    return plainText;
}
/**
 * 解析消息段数组（OneBot 格式）
 */
export function parseMessageSegments(segments) {
    const result = {
        text: '',
        atList: [],
        fileInfo: [],
        replyId: null,
    };
    if (!segments || !Array.isArray(segments)) {
        return result;
    }
    const textParts = [];
    for (const segment of segments) {
        const { type, data } = segment;
        switch (type) {
            case 'text':
                textParts.push(data.text || '');
                break;
            case 'at':
                result.atList.push(data.qq || '');
                textParts.push(`@${data.qq}`);
                break;
            case 'reply':
                result.replyId = data.id || null;
                break;
            case 'image':
                result.fileInfo.push({
                    type: 'image',
                    filename: data.file || data.filename || 'image',
                    fileId: data.file_id || '',
                    fileSize: '',
                    originalCQ: '',
                    params: { ...data },
                    url: data.url,
                });
                break;
            case 'file':
                result.fileInfo.push({
                    type: 'file',
                    filename: data.file || data.filename || 'file',
                    fileId: data.file_id || '',
                    fileSize: data.file_size || '',
                    originalCQ: '',
                    params: { ...data },
                });
                break;
            case 'video':
                result.fileInfo.push({
                    type: 'video',
                    filename: data.file || 'video',
                    fileId: data.file_id || '',
                    fileSize: '',
                    originalCQ: '',
                    params: { ...data },
                    url: data.url,
                });
                break;
            case 'record':
                result.fileInfo.push({
                    type: 'record',
                    filename: data.file || 'voice',
                    fileId: data.file_id || '',
                    fileSize: '',
                    originalCQ: '',
                    params: { ...data },
                    url: data.url,
                });
                break;
            case 'forward':
                result.fileInfo.push({
                    type: 'forward',
                    filename: `forward_${data.id || 'unknown'}`,
                    fileId: data.id || '',
                    fileSize: '',
                    originalCQ: '',
                    params: { ...data },
                });
                break;
            case 'face':
                textParts.push(`[表情:${data.id || ''}]`);
                break;
            case 'share':
                result.fileInfo.push({
                    type: 'share',
                    filename: data.title || '分享链接',
                    fileId: '',
                    fileSize: '',
                    originalCQ: '',
                    params: { ...data },
                    url: data.url,
                });
                break;
        }
    }
    result.text = textParts.join('');
    return result;
}
/**
 * 构建给 AI 的消息上下文
 * 包含文本、文件信息、引用消息等
 */
export function buildMessageContext(options) {
    const { text, senderName, senderId, messageType, groupId, fileInfo, replyContent } = options;
    const lines = [];
    // 消息来源
    if (messageType === 'group') {
        lines.push(`[群聊消息] 群号: ${groupId}, 发送者: ${senderName} (${senderId})`);
    }
    else {
        lines.push(`[私聊消息] 发送者: ${senderName} (${senderId})`);
    }
    // 引用消息
    if (replyContent) {
        lines.push(`[引用消息] ${replyContent}`);
    }
    // 文件信息
    if (fileInfo && fileInfo.length > 0) {
        for (const file of fileInfo) {
            if (file.type === 'image') {
                lines.push(`[图片] ${file.filename}${file.url ? ` URL: ${file.url}` : ''}`);
            }
            else if (file.type === 'file') {
                lines.push(`[文件] ${file.filename} (ID: ${file.fileId})`);
            }
            else if (file.type === 'video') {
                lines.push(`[视频] ${file.filename}`);
            }
            else if (file.type === 'record') {
                lines.push(`[语音] ${file.filename}`);
            }
            else if (file.type === 'forward') {
                lines.push(`[合并转发] ID: ${file.fileId}`);
            }
            else if (file.type === 'share') {
                lines.push(`[分享] ${file.filename}`);
            }
        }
    }
    // 消息内容
    if (text) {
        lines.push('');
        lines.push(text);
    }
    return lines.join('\n');
}
//# sourceMappingURL=parser.js.map