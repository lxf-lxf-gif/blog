/**
 * 专业 SEO 内容分析服务
 * 提供深度的内容质量和 SEO 优化分析
 */

/**
 * 计算字数（中英文混合）
 */
export const calculateWordCount = (text) => {
    if (!text) return { total: 0, chinese: 0, english: 0 };

    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = text
        .replace(/[\u4e00-\u9fa5]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0).length;

    return {
        total: chineseChars + englishWords,
        chinese: chineseChars,
        english: englishWords
    };
};

// 向后兼容的别名
export const countWords = calculateWordCount;

/**
 * 专业关键词密度分析
 * 返回详细的关键词分布和优化建议
 */
export const analyzeKeywordDensity = (content, keywords) => {
    if (!content || !keywords) return [];

    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
    const totalWords = calculateWordCount(content).total;

    return keywordList.map(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = content.match(regex) || [];
        const count = matches.length;
        const density = totalWords > 0 ? (count / totalWords) * 100 : 0;

        // SEO 专业建议：关键词密度 1-3% 为最佳
        let status = 'optimal';
        let suggestion = '关键词密度适中，保持现状';

        if (density < 0.5) {
            status = 'low';
            suggestion = '密度过低，建议在标题、小标题和正文中自然增加该关键词';
        } else if (density > 3) {
            status = 'high';
            suggestion = '密度过高，可能被判定为关键词堆砌，建议使用同义词替换部分关键词';
        } else if (density >= 0.5 && density < 1) {
            status = 'low';
            suggestion = '密度略低，可适当增加关键词出现频率';
        } else if (density > 2 && density <= 3) {
            status = 'optimal';
            suggestion = '密度良好，注意保持关键词的自然分布';
        }

        return { keyword, count, density, status, suggestion };
    });
};

/**
 * Flesch 可读性评分（中文适配版）
 */
export const calculateReadability = (text) => {
    if (!text) return { score: 0, level: '无内容', suggestion: '', avgWordsPerSentence: 0 };

    const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    const words = calculateWordCount(text).total;
    const avgWordsPerSentence = words / (sentences.length || 1);

    // 简化的可读性评分（针对中文优化）
    let score = 100 - (avgWordsPerSentence * 2);
    score = Math.max(0, Math.min(100, score));

    let level = '';
    let suggestion = '';

    if (score >= 80) {
        level = '非常易读';
        suggestion = '内容简洁明了，适合大众阅读';
    } else if (score >= 60) {
        level = '易读';
        suggestion = '内容通俗易懂，适合一般读者';
    } else if (score >= 40) {
        level = '中等';
        suggestion = '部分句子较长，建议适当拆分复杂句子';
    } else if (score >= 20) {
        level = '较难';
        suggestion = '句子普遍较长，建议简化表达，提高可读性';
    } else {
        level = '很难';
        suggestion = '内容过于复杂，强烈建议简化句子结构';
    }

    return {
        score: Math.round(score),
        level,
        suggestion,
        avgWordsPerSentence: Math.round(avgWordsPerSentence)
    };
};

/**
 * 标题 SEO 分析
 */
export const analyzeTitleSEO = (content) => {
    const h1Match = content.match(/^#\s+(.+)$/m);
    const title = h1Match ? h1Match[1] : '';

    if (!title) {
        return {
            title: '',
            length: 0,
            status: 'missing',
            suggestion: '❌ 缺少 H1 标题，这对 SEO 至关重要！'
        };
    }

    const length = calculateWordCount(title).total;
    let status = 'optimal';
    let suggestion = '✅ 标题长度适中';

    if (length < 10) {
        status = 'short';
        suggestion = '⚠️ 标题过短，建议扩展到 10-30 字以提供更多信息';
    } else if (length > 60) {
        status = 'long';
        suggestion = '⚠️ 标题过长，可能在搜索结果中被截断，建议控制在 60 字以内';
    } else if (length >= 10 && length <= 30) {
        status = 'optimal';
        suggestion = '✅ 标题长度理想，有利于 SEO';
    }

    return { title, length, status, suggestion };
};

/**
 * 内容结构分析
 */
export const analyzeContentStructure = (content) => {
    const h1Count = (content.match(/^#\s+/gm) || []).length;
    const h2Count = (content.match(/^##\s+/gm) || []).length;
    const h3Count = (content.match(/^###\s+/gm) || []).length;
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0).length;
    const images = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
    const links = (content.match(/\[.*?\]\(.*?\)/g) || []).length - images;

    const suggestions = [];

    if (h1Count === 0) {
        suggestions.push('❌ 缺少 H1 主标题');
    } else if (h1Count > 1) {
        suggestions.push('⚠️ 存在多个 H1 标题，建议只保留一个');
    }

    if (h2Count < 3) {
        suggestions.push('⚠️ H2 小标题较少，建议增加到 3-8 个以改善结构');
    }

    if (images === 0) {
        suggestions.push('💡 建议添加配图以提升用户体验');
    }

    if (links < 2) {
        suggestions.push('💡 建议添加内部链接或外部权威链接');
    }

    if (paragraphs < 5) {
        suggestions.push('⚠️ 段落数量较少，内容可能不够充实');
    }

    return {
        h1Count,
        h2Count,
        h3Count,
        paragraphs,
        images,
        links,
        suggestions: suggestions.length > 0 ? suggestions : ['✅ 内容结构良好']
    };
};

/**
 * SEO 综合评分
 */
export const calculateSEOScore = (content, keywords) => {
    let score = 0;
    const factors = [];

    // 1. 字数评分 (20分)
    const wordCount = calculateWordCount(content).total;
    if (wordCount >= 1500 && wordCount <= 3000) {
        score += 20;
        factors.push({ name: '字数', score: 20, status: 'good' });
    } else if (wordCount >= 1000) {
        score += 15;
        factors.push({ name: '字数', score: 15, status: 'ok' });
    } else {
        score += 5;
        factors.push({ name: '字数', score: 5, status: 'poor' });
    }

    // 2. 标题优化 (20分)
    const titleAnalysis = analyzeTitleSEO(content);
    if (titleAnalysis.status === 'optimal') {
        score += 20;
        factors.push({ name: '标题优化', score: 20, status: 'good' });
    } else if (titleAnalysis.status !== 'missing') {
        score += 10;
        factors.push({ name: '标题优化', score: 10, status: 'ok' });
    } else {
        factors.push({ name: '标题优化', score: 0, status: 'poor' });
    }

    // 3. 关键词密度 (25分)
    const keywordAnalysis = analyzeKeywordDensity(content, keywords);
    const optimalKeywords = keywordAnalysis.filter(k => k.status === 'optimal').length;
    const keywordScore = Math.min(25, (optimalKeywords / Math.max(1, keywordAnalysis.length)) * 25);
    score += keywordScore;
    factors.push({ name: '关键词优化', score: Math.round(keywordScore), status: keywordScore >= 20 ? 'good' : keywordScore >= 10 ? 'ok' : 'poor' });

    // 4. 内容结构 (20分)
    const structure = analyzeContentStructure(content);
    const structureIssues = structure.suggestions.filter(s => s.includes('❌') || s.includes('⚠️')).length;
    const structureScore = Math.max(0, 20 - (structureIssues * 5));
    score += structureScore;
    factors.push({ name: '内容结构', score: structureScore, status: structureScore >= 15 ? 'good' : structureScore >= 10 ? 'ok' : 'poor' });

    // 5. 可读性 (15分)
    const readability = calculateReadability(content);
    const readabilityScore = (readability.score / 100) * 15;
    score += readabilityScore;
    factors.push({ name: '可读性', score: Math.round(readabilityScore), status: readabilityScore >= 12 ? 'good' : readabilityScore >= 8 ? 'ok' : 'poor' });

    return {
        totalScore: Math.round(score),
        maxScore: 100,
        factors,
        grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
        summary: score >= 80 ? '优秀的 SEO 优化' : score >= 60 ? '良好的 SEO 基础' : score >= 40 ? '需要改进' : '需要大幅优化'
    };
};

/**
 * 获取完整的专业分析报告
 */
export const getFullAnalysis = (content, keywords) => {
    return {
        wordCount: calculateWordCount(content),
        keywordDensity: analyzeKeywordDensity(content, keywords),
        readability: calculateReadability(content),
        titleSEO: analyzeTitleSEO(content),
        structure: analyzeContentStructure(content),
        seoScore: calculateSEOScore(content, keywords)
    };
};

// SEO 元数据提取（保留向后兼容）
export const extractSEOMetadata = (content) => {
    const lines = content.split('\n');
    const metadata = {
        title: '',
        metaDescription: '',
        slug: '',
        h1: '',
        h2Count: 0,
        h3Count: 0
    };

    lines.forEach(line => {
        if (line.startsWith('# ') && !metadata.h1) {
            metadata.h1 = line.replace('# ', '').trim();
        }
        if (line.startsWith('## ')) {
            metadata.h2Count++;
        }
        if (line.startsWith('### ')) {
            metadata.h3Count++;
        }
    });

    return metadata;
};
