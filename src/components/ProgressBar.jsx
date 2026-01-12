import React from 'react';

/**
 * 进度条组件
 */
export const ProgressBar = ({ progress, status = 'generating' }) => {
    const statusText = {
        generating: '正在生成内容...',
        analyzing: '正在分析关键词...',
        images: '正在搜索配图...',
        complete: '生成完成！'
    };

    return (
        <div className="progress-container">
            <div className="progress-info">
                <span className="progress-status">{statusText[status]}</span>
                <span className="progress-percent">{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};
