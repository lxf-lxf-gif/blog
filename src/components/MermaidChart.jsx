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
 * 使用 React.memo 减少流式输出时的重绘压力
 */
export const MermaidChart = React.memo(({ chart }) => {
    const [svg, setSvg] = React.useState('');
    const [isRendering, setIsRendering] = React.useState(false);

    useEffect(() => {
        const renderChart = async () => {
            // 如果图表代码不完整（ streaming 过程中），不进行渲染，显示占位
            if (!chart || chart.trim().length < 10) return;

            setIsRendering(true);
            try {
                // 清理图表代码并强制横向布局
                let cleanChart = chart.trim();

                // 移除流式生成过程中可能出现的各种 Markdown 闭合干扰
                cleanChart = cleanChart.replace(/```mermaid/g, '').replace(/```/g, '');

                // 移除可能导致解析错误的特殊字符
                cleanChart = cleanChart.replace(/\->\^</g, '-->');
                cleanChart = cleanChart.replace(/\^</g, '');
                cleanChart = cleanChart.replace(/\-\^/g, '--');
                cleanChart = cleanChart.replace(/[\u200B-\u200D\uFEFF]/g, '');

                // 特殊修复：XY Chart
                if (cleanChart.includes('xychart')) {
                    if (!cleanChart.includes('xychart-beta')) {
                        cleanChart = cleanChart.replace('xychart', 'xychart-beta');
                    }
                    cleanChart = cleanChart.replace(/x-axis\s*\[(.*?)\]/g, (match, content) => {
                        const parts = content.split(',').map(p => p.trim());
                        const fixedParts = parts.map(p => {
                            if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) return p;
                            return `"${p}"`;
                        });
                        return `x-axis [${fixedParts.join(', ')}]`;
                    });
                }

                if (cleanChart.includes('graph TD') || cleanChart.includes('flowchart TD')) {
                    cleanChart = cleanChart.replace(/graph TD/g, 'graph LR');
                    cleanChart = cleanChart.replace(/flowchart TD/g, 'flowchart LR');
                }

                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, cleanChart);
                setSvg(svg);
            } catch (err) {
                // 流式过程中语法不完整是正常的，不报错
                console.debug('Mermaid partial render skipped');
            } finally {
                setIsRendering(false);
            }
        };

        const timer = setTimeout(renderChart, 100);
        return () => clearTimeout(timer);
    }, [chart]);

    // 加载中或无内容时的占位
    if (!svg) {
        return (
            <div className="mermaid-placeholder" style={{
                padding: '20px',
                margin: '16px 0',
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: '12px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <span>{isRendering ? '正在生成智能力图表...' : '等待图表数据完整...'}</span>
                </div>
            </div>
        );
    }

    const isXY = chart && (chart.includes('xychart') || chart.includes('xychart-beta'));

    return (
        <div className={`mermaid-chart mermaid-enhanced ${isXY ? 'mermaid-xy' : ''}`} dangerouslySetInnerHTML={{ __html: svg }} />
    );
});

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
