/**
 * 引用消息处理器
 * 参考 Python 项目 src/core/message_router.py
 *
 * 处理引用消息中的文本、文件、图片、合并转发等
 */
import { extractPlainText, extractFileInfo } from './parser';
import { getFileHandler } from './file-handler';
import { getNapCatClient } from '../napcat/client';
/**
 * 处理引用消息
 * @param replyId 引用消息 ID
 * @param userId 用户 QQ 号
 * @param groupId 群号（如果是群消息）
 * @param directory 工作目录
 * @returns 引用消息内容
 */
export async function processReplyMessage(replyId, userId, groupId, directory) {
    const napcat = getNapCatClient();
    try {
        // 获取引用消息的完整数据
        const replyMsg = await napcat.getMsg(replyId);
        if (!replyMsg) {
            return {
                text: '[引用消息已过期或无法获取]',
                files: [],
                rawMessage: '',
            };
        }
        const sender = replyMsg.sender?.nickname || '未知用户';
        let textContent = '';
        let fileInfoList = [];
        let processedFiles = [];
        // 提取文本内容
        if (replyMsg.message && Array.isArray(replyMsg.message)) {
            // OneBot 数组格式
            const textParts = [];
            for (const segment of replyMsg.message) {
                if (segment.type === 'text') {
                    textParts.push(segment.data?.text || '');
                }
            }
            textContent = textParts.join('');
            // 从 raw_message 提取文件信息
            if (replyMsg.raw_message) {
                fileInfoList = extractFileInfo(replyMsg.raw_message);
            }
        }
        else if (replyMsg.raw_message) {
            // CQ 码格式
            textContent = extractPlainText(replyMsg.raw_message);
            fileInfoList = extractFileInfo(replyMsg.raw_message);
        }
        // 处理 raw.records 中的文件信息（NapCat 特有格式）
        if (replyMsg.raw?.records && Array.isArray(replyMsg.raw.records)) {
            const recordsFiles = await processRecordsFiles(replyMsg.raw.records, userId, groupId, directory);
            processedFiles.push(...recordsFiles);
        }
        // 下载引用消息中的文件
        if (fileInfoList.length > 0 && directory) {
            const fileHandler = getFileHandler({ downloadDir: `${directory}/data/downloads` });
            const downloadedFiles = await fileHandler.processFileMessage(fileInfoList, userId, groupId);
            processedFiles.push(...downloadedFiles);
        }
        // 处理合并转发消息
        for (const fileInfo of fileInfoList) {
            if (fileInfo.type === 'forward' && fileInfo.fileId) {
                try {
                    const forwardData = await napcat.getForwardMsg(fileInfo.fileId);
                    if (forwardData && forwardData.messages && Array.isArray(forwardData.messages)) {
                        const forwardMessages = [];
                        for (const msg of forwardData.messages) {
                            const nickname = msg.sender?.nickname || '未知用户';
                            let content = '';
                            if (msg.message && Array.isArray(msg.message)) {
                                const parts = [];
                                for (const seg of msg.message) {
                                    if (seg.type === 'text') {
                                        parts.push(seg.data?.text || '');
                                    }
                                    else if (seg.type === 'image') {
                                        parts.push(`[图片: ${seg.data?.file || 'unknown'}]`);
                                    }
                                    else if (seg.type === 'file') {
                                        parts.push(`[文件: ${seg.data?.file || 'unknown'}]`);
                                    }
                                }
                                content = parts.join('');
                            }
                            else if (msg.raw_message) {
                                content = msg.raw_message;
                            }
                            if (content.trim()) {
                                forwardMessages.push(`${nickname}: ${content.trim()}`);
                            }
                        }
                        if (forwardMessages.length > 0) {
                            processedFiles.push(`[引用合并转发消息: ${forwardMessages.join(' | ')}]`);
                        }
                    }
                }
                catch (e) {
                    processedFiles.push(`[引用合并转发消息: 解析失败]`);
                }
            }
        }
        // 构建结果
        const result = {
            text: textContent.trim() || '[非文本消息]',
            files: processedFiles,
            rawMessage: replyMsg.raw_message || '',
        };
        return result;
    }
    catch (error) {
        return {
            text: '[引用消息 ID 无效]',
            files: [],
            rawMessage: '',
        };
    }
}
/**
 * 处理 raw.records 中的文件信息（NapCat 特有格式）
 */
async function processRecordsFiles(records, userId, groupId, directory) {
    const results = [];
    for (const record of records) {
        if (!record || typeof record !== 'object')
            continue;
        const elements = record.elements;
        if (!elements || !Array.isArray(elements))
            continue;
        for (const element of elements) {
            if (!element || typeof element !== 'object')
                continue;
            // 文件元素
            const fileElement = element.fileElement;
            if (fileElement && typeof fileElement === 'object') {
                const fileName = fileElement.fileName || fileElement.file_name || 'unknown';
                const fileSize = fileElement.fileSize || fileElement.file_size || 0;
                const fileUuid = fileElement.fileUuid;
                if (fileUuid && directory) {
                    try {
                        const napcat = getNapCatClient();
                        const fileData = await napcat.getFile(fileUuid);
                        if (fileData?.file) {
                            const fileHandler = getFileHandler({ downloadDir: `${directory}/data/downloads` });
                            const fileInfo = {
                                type: 'file',
                                filename: fileName,
                                fileId: fileUuid,
                                fileSize: String(fileSize),
                                originalCQ: '',
                                params: {},
                            };
                            const localPath = await fileHandler.downloadFile(fileInfo, userId);
                            if (localPath) {
                                results.push(`[引用文件: ${fileName}] (已下载到: ${localPath})`);
                            }
                            else {
                                results.push(`[引用文件: ${fileName}] (下载失败)`);
                            }
                        }
                        else {
                            results.push(`[引用文件: ${fileName}] (大小: ${fileSize}字节)`);
                        }
                    }
                    catch (e) {
                        results.push(`[引用文件: ${fileName}] (处理失败)`);
                    }
                }
                else {
                    results.push(`[引用文件: ${fileName}] (大小: ${fileSize}字节)`);
                }
            }
            // 图片元素
            const picElement = element.picElement;
            if (picElement && typeof picElement === 'object') {
                const fileName = picElement.fileName || picElement.file_name || `image_${picElement.md5HexStr || 'unknown'}.jpg`;
                const originImageUrl = picElement.originImageUrl || picElement.origin_image_url;
                let imageUrl = '';
                if (originImageUrl && originImageUrl.includes('rkey=')) {
                    if (originImageUrl.startsWith('/')) {
                        imageUrl = `https://multimedia.nt.qq.com.cn${originImageUrl}`;
                    }
                    else {
                        imageUrl = originImageUrl;
                    }
                }
                if (imageUrl && directory) {
                    try {
                        const fileHandler = getFileHandler({ downloadDir: `${directory}/data/downloads` });
                        const fileInfo = {
                            type: 'image',
                            filename: fileName,
                            fileId: '',
                            fileSize: '0',
                            originalCQ: '',
                            params: {},
                            url: imageUrl,
                        };
                        const localPath = await fileHandler.downloadFile(fileInfo, userId);
                        if (localPath) {
                            results.push(`[引用图片: ${fileName}] (已下载到: ${localPath})`);
                        }
                        else {
                            results.push(`[引用图片: ${fileName}] (下载失败)`);
                        }
                    }
                    catch (e) {
                        results.push(`[引用图片: ${fileName}] (处理失败)`);
                    }
                }
                else {
                    results.push(`[引用图片: ${fileName}]`);
                }
            }
            // 语音元素
            const pttElement = element.pttElement;
            if (pttElement && typeof pttElement === 'object') {
                results.push(`[引用语音消息]`);
            }
        }
    }
    return results;
}
/**
 * 格式化引用消息内容
 */
export function formatReplyContent(replyContent) {
    const parts = [];
    // 检查是否有文件信息
    const hasFiles = replyContent.files.length > 0;
    const hasForward = replyContent.files.some(f => f.includes('合并转发'));
    if (hasForward) {
        // 合并转发消息直接显示内容
        for (const file of replyContent.files) {
            if (file.includes('合并转发')) {
                parts.push(file);
            }
        }
    }
    else {
        // 其他情况
        if (replyContent.text && replyContent.text !== '[非文本消息]') {
            parts.push(`[引用消息: ${replyContent.text}]`);
        }
        if (hasFiles) {
            const fileParts = replyContent.files.filter(f => !f.includes('合并转发'));
            if (fileParts.length > 0) {
                parts.push(`[引用附件: ${fileParts.join(' ')}]`);
            }
        }
        else if (!replyContent.text || replyContent.text === '[非文本消息]') {
            parts.push('[引用非文本消息]');
        }
    }
    return parts.join(' ');
}
//# sourceMappingURL=reply-handler.js.map