import { useEffect } from 'react';

/**
 * 键盘快捷键 Hook
 */
export const useKeyboardShortcuts = (handlers) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl/Cmd + S - 保存/导出
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handlers.onSave?.();
            }

            // Ctrl/Cmd + E - 导出
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                handlers.onExport?.();
            }

            // Ctrl/Cmd + Enter - 生成
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handlers.onGenerate?.();
            }

            // Ctrl/Cmd + K - 续写
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                handlers.onContinue?.();
            }

            // Ctrl/Cmd + / - 搜索
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                handlers.onSearch?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlers]);
};
