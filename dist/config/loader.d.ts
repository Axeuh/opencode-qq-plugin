/**
 * 配置加载器 - 加载和管理 JSON 配置
 */
import { QQPluginConfig } from '../types';
/**
 * 初始化配置加载器
 */
export declare function initConfig(configFilePath?: string): QQPluginConfig;
/**
 * 获取配置
 */
export declare function getConfig(): QQPluginConfig;
/**
 * 重新加载配置
 */
export declare function reloadConfig(): QQPluginConfig;
/**
 * 获取特定配置项
 */
export declare function getBotConfig(): import("../types").BotConfig;
export declare function getNapCatConfig(): import("../types").NapCatConfig;
export declare function getOpenCodeConfig(): import("../types").OpenCodeConfig;
export declare function getWhitelistConfig(): import("../types").WhitelistConfig;
export declare function getSessionConfig(): import("../types").SessionConfig;
export declare function getWebServerConfig(): import("../types").WebServerConfig;
export declare function getFeaturesConfig(): import("../types").FeaturesConfig;
export declare function getInstanceLockConfig(): import("../types").InstanceLockConfig;
/**
 * 检查用户是否在白名单
 */
export declare function isUserWhitelisted(userId: number): boolean;
/**
 * 检查群组是否在白名单
 */
export declare function isGroupWhitelisted(groupId: number): boolean;
//# sourceMappingURL=loader.d.ts.map