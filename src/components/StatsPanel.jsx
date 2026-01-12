import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

/**
 * 统计面板组件
 */
export const StatsPanel = ({ history }) => {
    // 计算统计数据
    const totalGenerations = history.length;
    const totalWords = history.reduce((sum, item) => {
        if (item.content) {
            const chineseChars = (item.content.match(/[\u4e00-\u9fa5]/g) || []).length;
            const englishWords = item.content
                .replace(/[\u4e00-\u9fa5]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 0).length;
            return sum + chineseChars + englishWords;
        }
        return sum;
    }, 0);

    const avgWords = totalGenerations > 0 ? Math.round(totalWords / totalGenerations) : 0;

    // 最近7天的生成数据
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
            date: `${date.getMonth() + 1}/${date.getDate()}`,
            count: 0
        };
    });

    history.forEach(item => {
        const itemDate = new Date(item.id);
        const today = new Date();
        const diffDays = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            const index = 6 - diffDays;
            if (index >= 0 && index < 7) {
                last7Days[index].count++;
            }
        }
    });

    // 字数分布数据
    const wordDistribution = [
        { range: '0-1000', count: 0 },
        { range: '1000-2000', count: 0 },
        { range: '2000-3000', count: 0 },
        { range: '3000+', count: 0 }
    ];

    history.forEach(item => {
        if (item.content) {
            const chineseChars = (item.content.match(/[\u4e00-\u9fa5]/g) || []).length;
            const englishWords = item.content
                .replace(/[\u4e00-\u9fa5]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 0).length;
            const total = chineseChars + englishWords;

            if (total < 1000) wordDistribution[0].count++;
            else if (total < 2000) wordDistribution[1].count++;
            else if (total < 3000) wordDistribution[2].count++;
            else wordDistribution[3].count++;
        }
    });

    return (
        <div className="stats-panel">
            <h3>📈 生成统计</h3>

            <div className="stats-summary">
                <div className="stat-box">
                    <div className="stat-value">{totalGenerations}</div>
                    <div className="stat-label">总生成数</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">{totalWords.toLocaleString()}</div>
                    <div className="stat-label">总字数</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">{avgWords.toLocaleString()}</div>
                    <div className="stat-label">平均字数</div>
                </div>
            </div>

            <div className="chart-section">
                <h4>最近7天生成趋势</h4>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={last7Days}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                background: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px'
                            }}
                        />
                        <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="chart-section">
                <h4>字数分布</h4>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={wordDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                background: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px'
                            }}
                        />
                        <Bar dataKey="count" fill="#a855f7" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
