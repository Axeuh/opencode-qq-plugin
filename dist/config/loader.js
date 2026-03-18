/**
 * 配置加载器 - 加载和管理 JSON 配置
 */
import * as fs from 'fs';
import * as path from 'path';
let config = null;
let configPath = null;
/**
 * 初始化配置加载器
 */
export function initConfig(configFilePath) {
    // 确定配置文件路径
    configPath = configFilePath || findConfigFile();
    if (!configPath || !fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }
    // 读取并解析 JSON 配置
    const configContent = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configContent);
    return config;
}
/**
 * 查找配置文件
 */
function findConfigFile() {
    const possiblePaths = [
        // 当前工作目录
        path.join(process.cwd(), 'config.json'),
        // 插件目录
        path.join(__dirname, '..', '..', 'config.json'),
        // 用户配置目录
        path.join(process.env.USERPROFILE || '', '.config', 'opencode', 'qq-plugin', 'config.json'),
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return possiblePaths[0]; // 返回默认路径
}
/**
 * 获取配置
 */
export function getConfig() {
    if (!config) {
        return initConfig();
    }
    return config;
}
/**
 * 重新加载配置
 */
export function reloadConfig() {
    if (!configPath) {
        return initConfig();
    }
    return initConfig(configPath);
}
/**
 * 获取特定配置项
 */
export function getBotConfig() {
    return getConfig().bot;
}
export function getNapCatConfig() {
    return getConfig().napcat;
}
export function getOpenCodeConfig() {
    return getConfig().opencode;
}
export function getWhitelistConfig() {
    return getConfig().whitelist;
}
export function getSessionConfig() {
    return getConfig().session;
}
export function getWebServerConfig() {
    return getConfig().webServer || { enabled: true, port: 8080 };
}
export function getFeaturesConfig() {
    return getConfig().features;
}
export function getInstanceLockConfig() {
    return getConfig().instanceLock || { enabled: true, port: 4097 };
}
/**
 * 检查用户是否在白名单
 */
export function isUserWhitelisted(userId) {
    const whitelist = getWhitelistConfig();
    return whitelist.qqUsers.includes(userId);
}
/**
 * 检查群组是否在白名单
 */
export function isGroupWhitelisted(groupId) {
    const whitelist = getWhitelistConfig();
    return whitelist.groups.includes(groupId);
}
//# sourceMappingURL=loader.js.map