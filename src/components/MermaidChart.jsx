import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

// 初始化 Mermaid - 优化配色
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        background: '#ffffff',
        primaryColor: '#ffffff',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#6366f1',
        lineColor: '#6366f1',
        secondaryColor: '#f8fafc',
        tertiaryColor: '#f1f5f9',
        mainBkg: '#ffffff',
        secondBkg: '#f8fafc',
        tertiaryBkg: '#f1f5f9',
        nodeBorder: '#6366f1',
        clusterBkg: '#f8fafc',
        clusterBorder: '#94a3b8',
        textColor: '#1e293b',
        nodeTextColor: '#1e293b',
        labelTextColor: '#1e293b',
        titleColor: '#1e293b',
        edgeLabelBackground: '#f8fafc',
        // 饼图特定变量 - 还原之前的颜色
        pieTitleTextColor: '#1e293b',
        pieLegendTextColor: '#1e293b',
        pieSectionTextColor: '#ffffff',
        pie1: '#6366f1',
        pie2: '#a855f7',
        pie3: '#ec4899',
        pie4: '#f59e0b',
        pie5: '#10b981',
        pie6: '#3b82f6',
        pie7: '#ef4444',
        pie8: '#8b5cf6',
        pie9: '#06b6d4',
        pie10: '#f97316',
        pie11: '#14b8a6',
        pie12: '#84cc16',
        fontSize: '16px',
        fontFamily: '"Inter", "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif'
    },
    flowchart: {
        htmlLabels: false,
        curve: 'basis',
        padding: 12,
        nodeSpacing: 60,
        rankSpacing: 60,
        diagramPadding: 20,
        useMaxWidth: true, // 启用自适应
        wrappingWidth: 200
    },
    gantt: {
        useMaxWidth: true,
        topAxis: true,
        displayMode: 'compact'
    }
});

/**
 * Mermaid 图表组件
 */
export const MermaidChart = ({ chart }) => {
    const [svg, setSvg] = React.useState('');
    const [error, setError] = React.useState('');

    useEffect(() => {
        const renderChart = async () => {
            try {
                // 清理图表代码并强制横向布局
                let cleanChart = chart.trim();

                // 移除可能导致解析错误的特殊字符
                // 替换不支持的箭头符号
                cleanChart = cleanChart.replace(/\->\^</g, '-->');
                cleanChart = cleanChart.replace(/\^</g, '');
                cleanChart = cleanChart.replace(/\-\^/g, '--');

                // 清理其他可能的问题字符
                cleanChart = cleanChart.replace(/[\u200B-\u200D\uFEFF]/g, ''); // 零宽字符

                // 修复常见的 bar chart 语法错误 - 移除由于限制过严导致的误判逻辑
                // 让 Mermaid 自行处理语法校验

                // 特殊修复：XY Chart 的 x-axis 列表项必须加引号
                // 处理类似 [室温, 200°C] 这种未加引号导致解析失败的情况
                // 兼容性修复：强制使用 xychart-beta 以确保兼容性
                if (cleanChart.includes('xychart')) {
                    if (!cleanChart.includes('xychart-beta')) {
                        cleanChart = cleanChart.replace('xychart', 'xychart-beta');
                    }

                    cleanChart = cleanChart.replace(/x-axis\s*\[(.*?)\]/g, (match, content) => {
                        const parts = content.split(',').map(p => p.trim());
                        const fixedParts = parts.map(p => {
                            // 如果已经是引号包裹，保持原样；否则添加双引号
                            if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
                                return p;
                            }
                            return `"${p}"`;
                        });
                        return `x-axis [${fixedParts.join(', ')}]`;
                    });
                }

                // 如果是流程图且使用 TD，自动转换为 LR
                if (cleanChart.includes('graph TD') || cleanChart.includes('flowchart TD')) {
                    cleanChart = cleanChart.replace(/graph TD/g, 'graph LR');
                    cleanChart = cleanChart.replace(/flowchart TD/g, 'flowchart LR');
                }

                // 生成唯一 ID
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

                // 渲染图表
                const { svg } = await mermaid.render(id, cleanChart);
                setSvg(svg);
                setError('');
            } catch (err) {
                console.error('Mermaid rendering error:', err);
                console.error('Chart content:', chart);

                // 更友好的错误提示
                const errorMessage = err.message || '图表语法错误';

                // 静默处理错误，不显示在界面上（避免干扰用户）
                console.warn(`图表渲染失败: ${errorMessage}，已跳过显示`);
                setError(''); // 不显示错误，静默跳过
                setSvg(''); // 清空 SVG
            }
        };

        if (chart) {
            renderChart();
        }
    }, [chart]);

    if (error) {
        return (
            <div className="mermaid-error">
                <p style={{ color: '#ef4444', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontWeight: '600' }}>
                    ⚠️ {error}
                </p>
                <details style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '600' }}>查看原始代码</summary>
                    <pre style={{ background: 'var(--glass-bg)', padding: '12px', borderRadius: '8px', marginTop: '8px', fontSize: '13px' }}>
                        {chart}
                    </pre>
                </details>
            </div>
        );
    }

    // 如果没有 SVG 内容，不渲染任何内容（静默跳过）
    if (!svg) {
        return null;
    }

    // 检测是否为 XY Chart 以应用特定样式
    const isXY = chart && (chart.includes('xychart') || chart.includes('xychart-beta'));

    return (
        <div className={`mermaid-chart mermaid-enhanced ${isXY ? 'mermaid-xy' : ''}`} dangerouslySetInnerHTML={{ __html: svg }} />
    );
};

/**
 * 增强的 Markdown 渲染器，支持 Mermaid 图表和 GFM 表格
 */
export const MarkdownWithCharts = ({ content }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';

                    if (!inline && language === 'mermaid') {
                        return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
                    }

                    return (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
                table({ children }) {
                    return <table className="markdown-table">{children}</table>;
                },
                blockquote({ children }) {
                    // 提取子元素内容以判断是否为 [!TIP] 或 实战建议
                    const content = React.Children.toArray(children);
                    const firstChild = content[0];

                    if (firstChild && firstChild.props && firstChild.props.children) {
                        const firstLine = React.Children.toArray(firstChild.props.children)[0];

                        if (typeof firstLine === 'string') {
                            const isTip = firstLine.includes('[!TIP]') || firstLine.includes('实战建议');

                            if (isTip) {
                                // 移除标记并渲染为 Tip 样式
                                const cleanContent = React.Children.map(children, (child, idx) => {
                                    if (idx === 0 && child.props && child.props.children) {
                                        return React.cloneElement(child, {
                                            children: React.Children.map(child.props.children, (c) => {
                                                if (typeof c === 'string') {
                                                    return c.replace('[!TIP]', '').replace('实战建议：', '').replace('实战建议', '').trim();
                                                }
                                                return c;
                                            })
                                        });
                                    }
                                    return child;
                                });

                                return (
                                    <div className="markdown-alert-tip">
                                        <div className="alert-title">
                                            <span>💡</span> 实战建议 / EXPERT TIP
                                        </div>
                                        <div className="alert-content">
                                            {cleanContent}
                                        </div>
                                    </div>
                                );
                            }
                        }
                    }

                    return <blockquote>{children}</blockquote>;
                }
            }}
        >
            {content}
        </ReactMarkdown>
    );
};
