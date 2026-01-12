import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 语气描述映射
 */
const getToneDescription = (tone) => {
    const toneMap = {
        professional: '专业、正式、权威',
        casual: '轻松、友好、易读',
        technical: '技术性强、详细、深入',
        persuasive: '说服力强、引导性',
        educational: '教育性、解释性、循序渐进'
    };
    return toneMap[tone] || toneMap.professional;
};

/**
 * 处理知识库内容
 */
const processKBContent = (kbContent) => {
    if (!kbContent || kbContent.length === 0) return { textParts: '', inlineParts: [] };

    let textParts = '\n\n# 用户知识库 (User Knowledge Base):\n此部分内容具有最高优先级，请基于以下文档内容撰写文章：\n';
    const inlineParts = [];

    kbContent.forEach(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        // 图片或PDF走Multimodal
        if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'heic'].includes(ext)) {
            let mimeType = 'application/pdf';
            if (ext === 'png') mimeType = 'image/png';
            if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            if (ext === 'webp') mimeType = 'image/webp';

            inlineParts.push({
                inlineData: {
                    data: file.content,
                    mimeType: mimeType
                }
            });
            textParts += `\n[Reference File: ${file.name}] (See attached file content)\n`;
        } else {
            // 文本类直接解码放入Prompt
            try {
                const text = decodeURIComponent(escape(window.atob(file.content)));
                textParts += `\n## Document: ${file.name}\n${text}\n---\n`;
            } catch (e) {
                // Fallback
                try {
                    textParts += `\n## Document: ${file.name}\n${window.atob(file.content)}\n---\n`;
                } catch (err) {
                    console.warn(`Failed to decode ${file.name}`);
                }
            }
        }
    });
    return { textParts, inlineParts };
};

/**
 * 语言指令映射
 */
const getLanguageInstruction = (outputLanguage, wordCount) => {
    const langMap = {
        'zh': {
            name: '简体中文 (Simplified Chinese)',
            instruction: '请仅使用简体中文编写。',
            target: `${wordCount} 字（中文）`
        },
        'en': {
            name: 'English (英语)',
            instruction: 'Please write in English only.',
            target: `${wordCount} words`
        },
        'zh-en': {
            name: '中英双语 (Bilingual: CN + EN)',
            instruction: '请同时输出简体中文版和英文版内容。',
            target: `${wordCount} 字（中文）和相应篇幅的英文`
        },
        'hi': { name: 'हिन्दी (Hindi)', instruction: 'Please write in Hindi only.', target: `${wordCount} words` },
        'es': { name: 'Español (Spanish)', instruction: 'Please write in Spanish only.', target: `${wordCount} words` },
        'fr': { name: 'Français (French)', instruction: 'Please write in French only.', target: `${wordCount} words` },
        'ar': { name: 'العربية (Arabic)', instruction: 'Please write in Arabic only.', target: `${wordCount} words` },
        'bn': { name: 'বাংলা (Bengali)', instruction: 'Please write in Bengali only.', target: `${wordCount} words` },
        'pt': { name: 'Português (Portuguese)', instruction: 'Please write in Portuguese only.', target: `${wordCount} words` },
        'ru': { name: 'Русский (Russian)', instruction: 'Please write in Russian only.', target: `${wordCount} words` },
        'id': { name: 'Bahasa Indonesia (Indonesian)', instruction: 'Please write in Indonesian only.', target: `${wordCount} words` }
    };

    const lang = langMap[outputLanguage] || langMap['zh-en'];
    const isChineseTarget = outputLanguage === 'zh' || outputLanguage === 'zh-en';
    const translationInstruction = isChineseTarget ? '' : '\n**CRITICAL:** The input topic and keywords are in Chinese. You MUST translate them into the target output language. DO NOT use Chinese words in the final article, title, slug, or meta description.';

    return {
        instruction: `## 输出语言：${lang.name}\n${lang.instruction}${translationInstruction}`,
        wordCountTarget: lang.target
    };
};

/**
 * 根据用户选择生成图表类型说明
 */
const getChartTypesPrompt = (includeCharts, chartTypes) => {
    if (!includeCharts) return '';

    const selectedTypes = [];
    const examples = [];

    if (chartTypes.flowchart) {
        selectedTypes.push('**流程图 (Flowchart)**: graph LR（横向布局）');
        examples.push(`**示例 - 流程图（横向）：**
\`\`\`mermaid
graph LR
    A[开始] --> B[步骤1]
    B --> C[步骤2]
    C --> D[结束]
\`\`\``);
    }

    if (chartTypes.pie) {
        selectedTypes.push('**饼图 (Pie Chart)**: pie（展示占比数据）');
        examples.push(`**示例 - 饼图（数据占比）：**
\`\`\`mermaid
pie title 市场份额分布
    "产品A" : 45
    "产品B" : 30
    "产品C" : 25
\`\`\``);
    }

    if (chartTypes.xyChart) {
        selectedTypes.push('**柱状图/折线图 (XY Chart)**: xychart（用于展示数值对比或趋势）。**注意：x-axis 的分类标签列表必须使用双引号包裹，例如 ["一月", "二月"]。**');
        examples.push(`**示例 - 混合图表（柱状+折线）：**
\`\`\`mermaid
xychart
    title "季度销售额与增长率"
    x-axis ["Q1", "Q2", "Q3", "Q4"]
    y-axis "销售额 (百万)" 0 --> 100
    bar [25, 40, 60, 85]
    line [20, 35, 50, 80]
\`\`\``);
    }

    if (chartTypes.timeline) {
        selectedTypes.push('**时间轴 (Timeline)**: timeline（展示历史事件或里程碑）');
        examples.push(`**示例 - 发展历程：**
\`\`\`mermaid
timeline
    title 互联网发展简史
    1990 : World Wide Web
    1998 : Google 成立
    2004 : Facebook 上线 : Gmail 发布
    2007 : iPhone 发布
\`\`\``);
    }

    if (selectedTypes.length === 0) return '';

    const chartCount = Math.min(selectedTypes.length, 3);
    const chartCountText = chartCount === 1 ? '1个' : `${chartCount}个`;

    return `
### 📊 强制性数据可视化要求 (Mandatory Visualization Requirements):
必须包含 **${chartCountText}** Mermaid 格式的数据图表。
**请尽量使用所有选中的图表类型，每种类型至少使用一次。**

**✅ 只能使用以下选中的图表类型：**
${selectedTypes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

**图表插入原则：**
- **原生生成**：直接在 Markdown 内容块中生成 \`\`\`mermaid 代码块，不要使用占位符。
- **上下文关联**：图表必须与所在章节的技术内容紧密相关。
- **示例参考：**
${examples.join('\n\n')}

**❌ 严格禁止使用未选中的图表类型。**
**严格规则：**
1. 每个图表必须以 \`\`\`mermaid 开始，以 \`\`\` 结束。
2. 流程图必须使用 graph LR（横向）。
3. **图表代码中严禁使用特殊括号 ( ) 或 [ ] 以外的符号，以免解析失败。**`;
};

/**
 * 统一构建 Prompt 的私有辅助函数
 */
const _constructPrompt = (topic) => {
    const {
        blogTheme,
        keywords,
        wordCount = '2500',
        tone = 'professional',
        includeTables = true,
        includeCharts = true,
        chartTypes = { flowchart: true, pie: true, xyChart: true, timeline: true },
        anchorUrl = '',
        anchorText = '',
        outputLanguage = 'zh-en',
        targetRegion = 'United States',
        searchScope = 'Global',
        useKnowledgeBase = false,
        keyPoints = '',
        insertYoutube = false,
        imageStyle = 'Auto',
        externalBlacklist = [],
        kbContent = []
    } = topic;

    const langInfo = getLanguageInstruction(outputLanguage, wordCount);
    const { textParts: kbTextContext, inlineParts: kbInlineData } = processKBContent(kbContent);

    const prompt = `
# 谷歌SEO提示词规范：

# 角色(Role)：
你是一位拥有 20 年经验 de B2B 工业领域首席内容官 (CCO)，你不仅是 SEO 专家，更是行业深度观察者。你擅长超越基础信息，为决策者提供极具实战价值的深度洞察和避坑指南。
你精通多国语言本土化写作，能够精准捕捉不同语言环境下的商务语境和技术表达。

# 任务（Task）：
根据我提供的主题 and 核心关键词，撰写一篇 SEO 优化的博客文章，参考谷歌 E-E-A-T 原则（经验、专业性、权威性、可信度），使用第三人称写作。

## 目标人群 (Target audience)：
企业的决策者，如CEO、CTO、营销总监、运营总监、IT部门负责人、销售经理、采购经理。
他们的搜索意图：寻找解决方案、比较不同产品、了解行业最佳实践、寻求案例参考。


## 内容特质 (Content DNA)：
- **极致用户价值**：不仅提供信息，更提供“决策辅助”。包含实战建议、ROI 分析和风险预警，确保对 B2B 决策者有实质性帮助。
- **原创深度洞察**：拒绝百科全书式的平庸描述，必须包含基于 20 年行业经验的独到观点、底层逻辑剖析或行业“内幕”知识。
- **高信息密度**：每一段必须包含事实、数据或强逻辑推论，严禁通识性废话。
- **语义丰富度**：围绕核心关键词构建深层语义网，自然覆盖相关的 LSI 关键词和长尾需求。
- **模块化架构**：文章各章节独立性强，逻辑自洽，方便 AI 提取和引用。

${langInfo.instruction}

## 文章要求：
- **目标字数**：${langInfo.wordCountTarget}
- **语气风格**：${getToneDescription(tone)}

## SEO 技术规范 (SEO Technical Specs)：
* **Title Tag:** < 60 字符，包含主关键词 + 强力修饰词。
* **Meta Description:** 150-160 字符，包含主关键词，采用"痛点 + 解决方案 + 点击诱饵"结构。
* **URL Slug:** 短小精悍，纯小写，连字符连接。
* **Keyword Density:** 主关键词密度控制在 1.5% - 2.5%，自然分布于 H1, 前 100 词, H2, 和结尾。
* **LSI 关键词整合：** 自动识别并自然融入至少 5-8 个语义相关的长尾词，提升搜索覆盖面。
${includeTables ? '* **数据表格:** 必须包含至少2-3个Markdown格式的数据表格，用于展示产品参数对比、技术规格、价格对比等结构化数据。表格要清晰、专业、易读。' : ''}
${getChartTypesPrompt(includeCharts, chartTypes)}

# 强制约束 (Mandatory Constraints)：
1. **合规性：** 严禁使用违反广告法的绝对化用语。禁止出现“最好 (Best)”、“第一 (No.1)”、“顶级 (Top/Premier)”、“首选”、“唯一”等词。使用“优质”、“领先”、“专业”、“高标准”等客观描述。
2. **关键词布局：** 核心关键词必须出现在 H1、第一段前 100 字、至少一个 H2 中、结尾段落。
3. **格式要求：** 严格使用 Markdown。包含清晰的 H1, H2, H3 层级，使用列表或表格展示参数。所有图片必须包含SEO优化的alt文本，格式：![SEO关键词 - 图片描述](url)。
${anchorUrl ? `4. **内部链接 (Anchor Link)：** 必须在正文中自然穿插 2-3 个指向 ${anchorUrl} 的超链接。
   - 如果用户提供了锚文本 "${anchorText}"，则 **必须** 优先使用该文本。
   - 如果未提供锚文本，请根据上下文选择最相关的 **技术术语、核心产品名或 SEO 长尾词** 作为锚文本。
   - 严禁使用“点击这里”、“了解更多”、“这个链接”等无意义通用词。
   - 链接应出现在具有实质性讨论内容的段落中。` : ''}
${anchorUrl ? '5.' : '4.'} **篇幅：** 文章长度不少于 2200 字（中文）或 2000词（英文）。
${anchorUrl ? '6.' : '5.'} **语调：** 专业、客观、值得信赖。
${anchorUrl ? '7.' : '6.'} **禁止AI开头：** 绝不能出现“在当今高速发展的……”“随着……的崛起”等，直接从痛点或案例切入。
${anchorUrl ? '8.' : '7.'} **禁止出现 SEO 术语：** 严禁在生成的正文、标题、Meta Description 中出现 "E-E-A-T"、"EEAT"、"SEO"、"搜索意图"、"锚文本" 等术语。这些原则应自然内化在写作中，绝对不要在输出中显示出来。
${anchorUrl ? '9.' : '8.'} **结构化要求：** 文章必须包含至少 4-6 个 H2 标题层级，每个 H2 下方应有实质性的分析内容，确保文章深度和布局合理。
${anchorUrl ? '10.' : '9.'} **图表要求：** 如果已勾选图表选项，**必须**在文章的正文中自然插入相应数量的 Mermaid 图表。每个 H2 章节下方应优先考虑插入一个图表。
${anchorUrl ? '11.' : '10.'} **结论先行：** 每个 H2 章节的第一段必须直接给出该章节的核心结论或数据要点，严禁铺垫过长。
${anchorUrl ? '12.' : '11.'} **关键结论标注：** 在文中最重要的 3-5 个事实点使用 \`> [!IMPORTANT]\` 或 \`**核心结论：**\` 的形式标记，以便 AI 提取。
${anchorUrl ? '13.' : '12.'} **话题深度：** 严禁浮于表面。每个章节必须包含至少一个普通读者难以察觉的“行业洞察”或“技术细节”。
${anchorUrl ? '14.' : '13.'} **拒绝套路：** 禁止使用“总之”、“综上所述”等 AI 常用连接词。使用更具行业感和逻辑推进感的表达。
${anchorUrl ? '15.' : '14.'} **实战性：** 文章必须提及至少一个该领域常见的“典型痛点”及其“隐形成本”。
${anchorUrl ? '16.' : '15.'} **结构化 FAQ：** 文章末尾必须包含 5 个基于长尾关键词的常见问题，每个问题使用 H3 标题，回答要专业、详尽且包含核心事实。
${anchorUrl ? '17.' : '16.'} **严禁字符标签：** 严禁在正文中显示 "H1:", "H2:", "H3:", "FAQ:", "Title:" 等字面量引导标签。必须直接使用 Markdown 符号（如 \`#\`, \`##\`, \`###\`）后接内容。
${anchorUrl ? '18.' : '17.'} **实战 Tips 嵌入：** 在每个 H2 章节中，根据逻辑流向自然穿插 3-4 个带有 \`> [!TIP]\` 或 \`**实战建议：**\` 标记的 Tips 片段。内容应高度聚焦于“避坑指南”、“效率提升”或“隐形成本”。
${insertYoutube ? `\n${anchorUrl ? '19.' : '18.'} **视频占位：** 请在合适的位置预留 YouTube 视频占位符 [YouTube Video Placeholder]。` : ''}

# 文章结构 (Article Structure)：
1. SEO Meta Data Block (Title, Slug, Meta Description)
2. H1 (含核心关键词)
3. Key Takeaways (核心摘要块：使用 Markdown 引用块列出 3 个核心价值点)
4. 引言 (直击痛点，不超过 150 字)
5. Table of Contents (带有 Markdown 锚点链接)
6. H2 内容块：
   - 首段结论（AI Catch Sentence）
   - 中间为深度解析、数据、表格或图表
   - 结尾为一段简洁的“可引用结论”
7. FAQ (必须包含 5 个基于长尾词 of H3 级别问题，Schema 友好格式)
8. 结论与 CTA (引导咨询)
9. PAA (每 800 字插入一个 Expert Answer 引用块)

# 输入数据 (Input Data)：
* **主题：** ${blogTheme}
* **核心关键词：** ${keywords}
* **目标区域：** ${targetRegion}
* **搜索范围：** ${searchScope}
${useKnowledgeBase ? '* **参考来源：** 优先参考用户提供的知识库信息。' : ''}
${kbTextContext}
${keyPoints ? `* **关键要点：** 必须涵盖以下内容：${keyPoints}` : ''}
* **图像风格建议：** ${imageStyle}
${externalBlacklist.length > 0 ? `* **禁止引用的外部域名：** ${externalBlacklist.join(', ')}` : ''}

请开始生成：
`;

    return { prompt, kbInlineData };
};

/**
 * AI Service for Gemini Blog Pro
 * Integrated with Advanced Google SEO Prompt Architecture
 */
export const generateBlogContent = async (apiKey, topic, options, modelName = "gemini-2.5-flash") => {
    if (!apiKey) throw new Error("请先输入 API Key");

    const genAI = new GoogleGenerativeAI(apiKey);

    // 如果是 Web 环境，使用 hook 方式截获请求 (GoogleGenerativeAI SDK v0.24+ 支持 requestOptions)
    // 但目前的 Google SDK 并不直接支持简单的 baseUrl 替换。
    // 上面的 apiClient.fetch 是理想情况，但官方 SDK 可能不支持。
    // 另一种方法是：如果我们在 Web 环境，我们自己构造 fetch 请求而不使用 SDK，或者使用 SDK 的底层 rest client。

    // 修正方案：Google SDK 目前不直接支持 custom fetch。
    // 我们需要 hack 一下或者直接使用 REST API 如果是 Web 环境。
    // 鉴于 SDK 封装了很多逻辑（Stream 处理等），完全重写成本高。
    // 幸好，GoogleGenerativeAI 构造函数接受 requestOptions，我们可以尝试通过拦截 fetch。
    // 或者，更简单的方法：直接修改全局 fetch (不推荐) 或使用 SDK 的 baseUrl (SDK 不支持)。

    // 让我们尝试目前最稳妥的方案：
    // 使用 SDK，但是利用 Vercel Rewrite。
    // 在 vercel.json 中配置 rewrite 规则，将 googleapis.com 的请求转发。
    // 但是前端代码里的 SDK 是写死域名的。

    // 所以，我们必须使用上面的 API Proxy 方案，但是结合 SDK。
    // 实际上 Google Generative AI SDK 允许传入自定义 fetch。
    // 在 v0.2.0+ 中，可以在 getGenerativeModel 中不直接支持。
    // 我们来看一下源码或文档... 
    // SDK 确实难以定制 fetch。

    // **替代方案**：手动实现一个极简的 streamRequest 供 Web 使用。
    // 保持 Electron 使用 SDK。Web 使用我们自己的 fetch logic。

    // 基础 Prompt 准备
    const { prompt, kbInlineData } = _constructPrompt(topic);

    // 环境检测
    const isElectron = !!(window && window.process && window.process.type);

    if (isElectron) {
        // Electron 环境：直接使用 SDK (保持原样)
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        });

        try {
            const input = kbInlineData.length > 0 ? [prompt, ...kbInlineData] : prompt;
            const result = await model.generateContent(input);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini API Error (Electron):", error);
            throw new Error(`生成失败: ${error.message}`);
        }
    } else {
        // Web 环境：使用 Proxy
        try {
            // 构建 contents
            let contents = [{ role: 'user', parts: [{ text: prompt }] }];

            // 如果有 inline data (图片/文档)
            if (kbInlineData.length > 0) {
                const parts = [{ text: prompt }];
                kbInlineData.forEach(item => {
                    parts.push(item);
                });
                contents = [{ role: 'user', parts: parts }];
            }

            const proxyResponse = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                    body: {
                        contents: contents,
                        generationConfig: {
                            temperature: 0.7,
                            topP: 0.95,
                            maxOutputTokens: 8192,
                        }
                    }
                })
            });

            if (!proxyResponse.ok) {
                const errText = await proxyResponse.text();
                throw new Error(`Web API Error: ${errText}`);
            }

            const data = await proxyResponse.json();

            // 解析 Gemini REST API 响应
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
                return data.candidates[0].content.parts.map(p => p.text).join('');
            } else {
                return '';
            }

        } catch (error) {
            console.error("Gemini API Error (Web Proxy):", error);
            throw new Error(`Web生成失败: ${error.message}`);
        }
    }
};

/**
 * 内容续写功能
 */
export const continueContent = async (apiKey, existingContent, modelName = "gemini-2.5-flash") => {
    if (!apiKey) throw new Error("请先输入 API Key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
以下是一篇未完成的文章，请继续写下去，保持相同的风格、语调和专业度：

${existingContent}

请继续上述内容，增加 500-800 字的深度内容。
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error(`续写失败: ${error.message}`);
    }
};

/**
 * 内容重写功能
 */
export const rewriteContent = async (apiKey, content, style = "professional", modelName = "gemini-2.5-flash") => {
    if (!apiKey) throw new Error("请先输入 API Key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const styleMap = {
        professional: "专业、正式",
        casual: "轻松、口语化",
        technical: "技术性强、详细"
    };

    const prompt = `
请将以下内容重写为${styleMap[style] || styleMap.professional}的风格，保持核心信息不变：

${content}

请直接输出重写后的内容，不需要额外说明。
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error(`重写失败: ${error.message}`);
    }
};

/**
 * 流式输出生成博客内容
 */
export const generateBlogContentStream = async (apiKey, topic, options, modelName = "gemini-2.5-flash", onChunk) => {
    // -----------------------------------------------------------
    // STREAMING IMPLEMENTATION (Cross-Platform)
    // -----------------------------------------------------------

    if (!apiKey) throw new Error("请先输入 API Key");

    // 环境检测
    const isElectron = !!(window && window.process && window.process.type);

    // 构建 Prompt
    const { prompt, kbInlineData } = _constructPrompt(topic);

    // 1. Electron 环境：直接使用 SDK
    if (isElectron) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        });

        try {
            const input = kbInlineData.length > 0 ? [prompt, ...kbInlineData] : prompt;
            const result = await model.generateContentStream(input);

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                onChunk(chunkText);
            }

            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini API Error (Electron Stream):", error);
            throw new Error(`流式生成失败: ${error.message}`);
        }
    } else {
        // 2. Web 环境：使用 Proxy + SSE Parsing
        try {
            // 构建 contents
            let contents = [{ role: 'user', parts: [{ text: prompt }] }];
            if (kbInlineData.length > 0) {
                const parts = [{ text: prompt }];
                kbInlineData.forEach(item => { parts.push(item); });
                contents = [{ role: 'user', parts: parts }];
            }

            const proxyResponse = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // 使用 streamGenerateContent API
                    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`,
                    body: {
                        contents: contents,
                        generationConfig: {
                            temperature: 0.7,
                            topP: 0.95,
                            maxOutputTokens: 8192,
                        }
                    }
                })
            });

            if (!proxyResponse.ok) {
                throw new Error(`Web Proxy Error: ${proxyResponse.status}`);
            }

            // 处理 SSE 流
            const reader = proxyResponse.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.replace('data: ', '').trim();
                        if (jsonStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(jsonStr);
                            if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                                const textPart = data.candidates[0].content.parts[0].text;
                                if (textPart) {
                                    onChunk(textPart);
                                    fullText += textPart;
                                }
                            }
                        } catch (e) {
                            // ignore partial JSON
                        }
                    }
                }
            }
            return fullText;

        } catch (error) {
            console.error("Gemini API Error (Web Stream):", error);
            throw new Error(`Web流式生成失败: ${error.message}`);
        }
    }
}


/**
 * 语义关键词扩展功能
 * 使用 AI 自动发现与输入关键词语义相关的词汇
 */
export const expandKeywords = async (apiKey, keywords, blogTheme = '', modelName = "gemini-2.5-flash") => {
    if (!apiKey) throw new Error("请先输入 API Key");
    if (!keywords || keywords.trim() === '') throw new Error("请先输入关键词");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.8,  // 稍高的温度以获得更多样化的关键词
            topP: 0.95,
            maxOutputTokens: 1024,
        }
    });

    const prompt = `
# 角色
你是一位专业的 SEO 关键词研究专家，擅长语义分析和关键词扩展。

# 任务
基于用户提供的核心关键词，使用语义向量分析方法，发现与之相关的扩展关键词。

# 输入
- **核心关键词**: ${keywords}
${blogTheme ? `- **主题背景**: ${blogTheme}` : ''}

# 要求
1. 分析核心关键词的语义向量和上下文
2. 发现以下类型的相关关键词：
   - 同义词和近义词
   - 相关技术术语
   - 行业专业词汇
   - 长尾关键词
   - 用户搜索意图相关词
3. 每个类别提供 3-5 个高质量关键词
4. 关键词应该具有 SEO 价值和搜索潜力
5. 避免重复和过于宽泛的词汇

# 输出格式
请严格按照以下 JSON 格式输出，不要添加任何其他文字说明：

{
  "synonyms": ["同义词1", "同义词2", "同义词3"],
  "technical": ["技术术语1", "技术术语2", "技术术语3"],
  "industry": ["行业词汇1", "行业词汇2", "行业词汇3"],
  "longtail": ["长尾词1", "长尾词2", "长尾词3"],
  "intent": ["意图词1", "意图词2", "意图词3"]
}

请开始分析并输出 JSON 格式的扩展关键词：
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('AI Response:', text); // 调试日志

        // 尝试多种方式提取 JSON
        let expandedKeywords = null;

        // 方法1: 提取代码块中的 JSON (修复版)
        const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (codeBlockMatch) {
            try {
                let jsonText = codeBlockMatch[1].trim();
                // 清理常见的 JSON 格式问题
                jsonText = jsonText
                    .replace(/,(\s*[}\]])/g, '$1')  // 移除尾随逗号
                    .replace(/'/g, '"');             // 将单引号替换为双引号

                expandedKeywords = JSON.parse(jsonText);
                console.log('✅ Parsed from code block:', expandedKeywords);
            } catch (e) {
                console.warn('❌ Code block JSON parse failed:', e.message);
            }
        }

        // 方法2: 直接提取 JSON 对象
        if (!expandedKeywords) {
            const jsonMatch = text.match(/\{[\s\S]*?"synonyms"[\s\S]*?\}/);
            if (jsonMatch) {
                try {
                    expandedKeywords = JSON.parse(jsonMatch[0]);
                    console.log('Parsed from direct match:', expandedKeywords);
                } catch (e) {
                    console.warn('Direct JSON parse failed:', e);
                }
            }
        }

        // 方法3: 清理后再解析
        if (!expandedKeywords) {
            const cleanedText = text
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();

            // 找到第一个 { 和最后一个 }
            const firstBrace = cleanedText.indexOf('{');
            const lastBrace = cleanedText.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const jsonText = cleanedText.substring(firstBrace, lastBrace + 1);
                try {
                    expandedKeywords = JSON.parse(jsonText);
                    console.log('Parsed from cleaned text:', expandedKeywords);
                } catch (e) {
                    console.warn('Cleaned JSON parse failed:', e);
                }
            }
        }

        if (!expandedKeywords) {
            console.error("Failed to parse JSON. Full response:", text);
            throw new Error("AI 返回格式错误。请查看控制台了解详情");
        }

        // 验证返回的数据结构
        const requiredKeys = ['synonyms', 'technical', 'industry', 'longtail', 'intent'];
        const hasValidStructure = requiredKeys.some(key => expandedKeywords[key]);

        if (!hasValidStructure) {
            console.error("Invalid structure:", expandedKeywords);
            throw new Error("AI 返回的数据结构不完整");
        }

        console.log('Successfully parsed keywords:', expandedKeywords);
        return expandedKeywords;
    } catch (error) {
        console.error("Keyword Expansion Error:", error);

        // 如果是 JSON 解析错误，提供更友好的提示
        if (error instanceof SyntaxError) {
            throw new Error(`JSON 格式错误: ${error.message}。请重试或更换模型`);
        }

        throw new Error(`关键词扩展失败: ${error.message}`);
    }
};

/**
 * 智能分析用户输入，提取主题和关键词
 */
export const analyzeTopicIntent = async (apiKey, userInput, modelName = "gemini-2.5-flash") => {
    if (!apiKey) throw new Error("请先输入 API Key");

    // 如果输入非常短，直接作为主题
    if (!userInput || userInput.trim().length < 2) {
        return { theme: userInput, keywords: "" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
User Input: "${userInput}"

Analyze the user's input and extract:
1. "theme": A clear, concise, and engaging blog post title/topic based on the input.
2. "keywords": 2-3 core SEO keywords relevant to the topic (comma-separated).

Return strictly valid JSON:
{
  "theme": "...",
  "keywords": "..."
}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { theme: userInput, keywords: "" };
    } catch (error) {
        console.warn("Topic Analysis Error:", error);
        return { theme: userInput, keywords: "" };
    }
};
