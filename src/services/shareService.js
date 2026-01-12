/**
 * Share Service - 分享与协作功能
 */

// 复制到剪贴板
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    }
};

// 生成分享链接（使用 Base64 编码）
export const generateShareLink = (content, title) => {
    const data = {
        title,
        content,
        timestamp: Date.now()
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?share=${encoded}`;
};

// 解析分享链接
export const parseShareLink = () => {
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');

    if (!shareData) return null;

    try {
        const decoded = JSON.parse(decodeURIComponent(atob(shareData)));
        return decoded;
    } catch {
        return null;
    }
};

// 下载为文件
export const downloadAsFile = (content, filename, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
