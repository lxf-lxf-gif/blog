/**
 * Pexels Image Service
 * 使用 Pexels API 搜索和获取高质量图片
 */

const PEXELS_API_BASE = 'https://api.pexels.com/v1';

/**
 * 搜索图片
 * @param {string} query - 搜索关键词
 * @param {string} apiKey - Pexels API Key
 * @param {number} perPage - 每页数量
 * @returns {Promise<Array>} 图片数组
 */
export const searchImages = async (query, apiKey, perPage = 5) => {
    if (!apiKey) {
        throw new Error('请先配置 Pexels API Key');
    }

    try {
        const response = await fetch(
            `${PEXELS_API_BASE}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
            {
                headers: {
                    'Authorization': apiKey
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Pexels API 错误: ${response.status}`);
        }

        const data = await response.json();
        return data.photos || [];
    } catch (error) {
        console.error('Pexels API Error:', error);
        throw error;
    }
};

/**
 * 从文章内容中提取关键词
 * @param {string} content - 文章内容
 * @param {number} count - 提取数量
 * @returns {Array<string>} 关键词数组
 */
export const extractKeywordsFromContent = (content, count = 3) => {
    // 提取 H2 标题作为关键词
    const h2Regex = /^##\s+(.+)$/gm;
    const matches = [...content.matchAll(h2Regex)];

    const keywords = matches
        .map(match => match[1].trim())
        .filter(title => !title.includes('FAQ') && !title.includes('目录'))
        .slice(0, count);

    return keywords;
};

/**
 * 为文章内容插入图片
 * 实现 H2 -> H3 -> Paragraph 多级插入逻辑，并确保图片与内容对应
 */
export const insertImagesIntoContent = async (content, pexelsApiKey, baseKeywords = [], maxImages = 3) => {
    if (!pexelsApiKey) {
        return content;
    }

    try {
        console.log('🖼️ 开始深度内容匹配图搜与插入...');

        // 1. 查找所有可能的插入点
        const injectionPoints = [];

        // 查找 H2
        const h2Regex = /^##\s+(.+)$/gm;
        const h2Matches = [...content.matchAll(h2Regex)];
        h2Matches.forEach(m => {
            if (!m[1].includes('FAQ') && !m[1].includes('目录')) {
                injectionPoints.push({
                    type: 'H2',
                    text: m[1].trim(),
                    fullMatch: m[0],
                    index: m.index
                });
            }
        });

        // 如果 H2 不够，寻找 H3
        if (injectionPoints.length < maxImages) {
            const h3Regex = /^###\s+(.+)$/gm;
            const h3Matches = [...content.matchAll(h3Regex)];
            h3Matches.forEach(m => {
                injectionPoints.push({
                    type: 'H3',
                    text: m[1].trim(),
                    fullMatch: m[0],
                    index: m.index
                });
            });
        }

        // 如果还是不够，寻找段落间隙
        if (injectionPoints.length < maxImages) {
            const paragraphs = content.split('\n\n');
            if (paragraphs.length > 5) {
                for (let i = 2; i < paragraphs.length - 1 && injectionPoints.length < maxImages + 2; i += 2) {
                    const paraText = paragraphs[i].trim();
                    if (paraText.length > 50) {
                        const indexInContent = content.indexOf(paraText);
                        injectionPoints.push({
                            type: 'Paragraph',
                            text: paraText.substring(0, 30), // 用开头文字作为搜索参考
                            fullMatch: paraText,
                            index: indexInContent
                        });
                    }
                }
            }
        }

        if (injectionPoints.length === 0) {
            console.warn('未找到任何插入点');
            return content;
        }

        // 只保留需要的数量，并按位置排序
        const targetPoints = injectionPoints
            .sort((a, b) => a.index - b.index)
            .slice(0, maxImages);

        console.log(`确定了 ${targetPoints.length} 个插入点:`, targetPoints.map(p => p.type));

        // 提取核心参考词（取前两个作为背景）
        const contextKeyword = baseKeywords.length > 0 ? baseKeywords[0] : '';

        let enhancedContent = content;
        let offset = 0;

        // 逐个插入点处理
        for (let i = 0; i < targetPoints.length; i++) {
            const point = targetPoints[i];

            // 构造针对该章节的精准搜索词
            // 规则：核心词 + 章节标题（去除括号等干扰）
            let sectionTitle = point.text.replace(/[#\(\)\[\]]/g, '').trim();
            let searchQuery = contextKeyword ? `${contextKeyword} ${sectionTitle}` : sectionTitle;

            console.log(`正在为 [${point.type}] "${point.text}" 寻找图片，搜索词: "${searchQuery}"`);

            try {
                const photos = await searchImages(searchQuery, pexelsApiKey, 1);

                if (photos && photos.length > 0) {
                    const image = photos[0];
                    const altText = `${searchQuery} - ${image.alt || '高质量配图'}`;
                    const imageMarkdown = `\n\n![${altText}](${image.src.large})\n*图片来源: ${image.photographer} via Pexels*\n`;

                    // 寻找实际插入位置
                    const currentPos = point.index + point.fullMatch.length + offset;
                    const nextLineBreak = enhancedContent.indexOf('\n', currentPos);
                    const insertPos = nextLineBreak !== -1 ? nextLineBreak + 1 : currentPos;

                    enhancedContent =
                        enhancedContent.slice(0, insertPos) +
                        imageMarkdown +
                        enhancedContent.slice(insertPos);

                    offset += imageMarkdown.length;
                    console.log(`✅ 图片插入成功: ${point.type}`);
                } else {
                    console.warn(`❌ 无结果: "${searchQuery}"`);
                }
            } catch (err) {
                console.error(`搜索失败: ${searchQuery}`, err);
            }
        }

        return enhancedContent;
    } catch (error) {
        console.error('图片插入核心流程错误:', error);
        return content;
    }
};

/**
 * 获取精选图片
 * @param {string} apiKey - Pexels API Key
 * @param {number} perPage - 数量
 * @returns {Promise<Array>} 图片数组
 */
export const getCuratedPhotos = async (apiKey, perPage = 10) => {
    if (!apiKey) {
        throw new Error('请先配置 Pexels API Key');
    }

    try {
        const response = await fetch(
            `${PEXELS_API_BASE}/curated?per_page=${perPage}`,
            {
                headers: {
                    'Authorization': apiKey
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Pexels API 错误: ${response.status}`);
        }

        const data = await response.json();
        return data.photos || [];
    } catch (error) {
        console.error('Pexels API Error:', error);
        throw error;
    }
};
