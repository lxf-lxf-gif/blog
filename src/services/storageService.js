/**
 * Storage Service - 本地存储服务
 * 处理 API Key、历史记录、用户偏好的持久化
 */

const STORAGE_KEYS = {
    API_KEY: 'gemini_blog_api_key',
    HISTORY: 'gemini_blog_history',
    PREFERENCES: 'gemini_blog_preferences',
    THEME: 'gemini_blog_theme'
};

// 简单的加密/解密（Base64，生产环境应使用更强的加密）
const encrypt = (text) => btoa(text);
const decrypt = (text) => {
    try {
        return atob(text);
    } catch {
        return '';
    }
};

// API Key 管理
export const saveApiKey = (apiKey) => {
    localStorage.setItem(STORAGE_KEYS.API_KEY, encrypt(apiKey));
};

export const getApiKey = () => {
    const encrypted = localStorage.getItem(STORAGE_KEYS.API_KEY);
    return encrypted ? decrypt(encrypted) : '';
};

export const clearApiKey = () => {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
};

// 历史记录管理
export const saveHistory = (history) => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
};

export const getHistory = () => {
    const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return stored ? JSON.parse(stored) : [];
};

export const addHistoryItem = (item) => {
    const history = getHistory();
    const newHistory = [item, ...history].slice(0, 50); // 最多保存 50 条
    saveHistory(newHistory);
    return newHistory;
};

export const deleteHistoryItem = (id) => {
    const history = getHistory();
    const newHistory = history.filter(item => item.id !== id);
    saveHistory(newHistory);
    return newHistory;
};

export const updateHistoryItem = (id, updates) => {
    const history = getHistory();
    const newHistory = history.map(item =>
        item.id === id ? { ...item, ...updates } : item
    );
    saveHistory(newHistory);
    return newHistory;
};

export const searchHistory = (query) => {
    const history = getHistory();
    return history.filter(item =>
        item.title?.toLowerCase().includes(query.toLowerCase()) ||
        item.content?.toLowerCase().includes(query.toLowerCase())
    );
};

// 用户偏好管理
export const savePreferences = (preferences) => {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
};

export const getPreferences = () => {
    const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    return stored ? JSON.parse(stored) : {
        selectedModel: 'gemini-1.5-pro',
        includeTable: true,
        includeImageSuggestions: true
    };
};

// 主题管理
export const saveTheme = (theme) => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
};

export const getTheme = () => {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
};
