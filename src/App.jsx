import React, { useState } from 'react';
import './App.css';
import './styles/markdown-center.css';
import './styles/mobile.css';
import {
  PlusCircle,
  Settings,
  History,
  Sparkles,
  Table as TableIcon,
  Image as ImageIcon,
  Send,
  FileText,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  LogOut,
  Moon,
  Zap,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { generateBlogContent, continueContent, rewriteContent, generateBlogContentStream, expandKeywords, analyzeTopicIntent } from './services/aiService';
import { exportAsMarkdown, exportAsPDF, exportAsWord } from './services/exportService';
import {
  saveApiKey,
  getApiKey,
  getHistory,
  addHistoryItem,
  deleteHistoryItem,
  searchHistory,
  getPreferences,
  savePreferences
} from './services/storageService';
import { getFullAnalysis } from './services/analyticsService';
import { copyToClipboard, generateShareLink, parseShareLink } from './services/shareService';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { insertImagesIntoContent } from './services/imageService';
import { ProgressBar } from './components/ProgressBar';
import { QRCodeSVG } from 'qrcode.react';
import { StatsPanel } from './components/StatsPanel';
import { MarkdownWithCharts } from './components/MermaidChart';

function App() {
  const [activeTab, setActiveTab] = useState('editor');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiKey, setApiKey] = useState(() => getApiKey());
  const [blogTheme, setBlogTheme] = useState('');
  const [keywords, setKeywords] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = getPreferences().selectedModel;
    // 自动重置旧的模型名称
    if (saved === 'gemini-1.5-pro' || saved === 'gemini-1.5-flash' || saved === 'gemini-pro') {
      localStorage.setItem('selectedModel', 'gemini-1.5-flash');
      return 'gemini-1.5-flash';
    }
    return saved || 'gemini-1.5-flash';
  });
  const [customModelName, setCustomModelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState(() => getPreferences());
  const [content, setContent] = useState('# 欢迎使用 Gemini 博客助手\n\n在右侧输入您的博客话题，我将为您生成高质量的内容、数据表格和配图建议。');
  const [history, setHistory] = useState(() => getHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [appTheme, setAppTheme] = useState(() => localStorage.getItem('app-theme') || 'dark');
  const [wordCount, setWordCount] = useState('2500'); // 默认字数
  const [tone, setTone] = useState('professional'); // 默认语气
  const [pexelsApiKey, setPexelsApiKey] = useState(() => localStorage.getItem('pexels_api_key') || '');
  const [autoInsertImages, setAutoInsertImages] = useState(true);
  const [imageCount, setImageCount] = useState(2); // 默认2张图片
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('generating');
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQRCodeUrl] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [includeTables, setIncludeTables] = useState(true); // 默认包含数据表
  const [includeCharts, setIncludeCharts] = useState(true); // 默认包含图表
  const [chartTypes, setChartTypes] = useState({
    flowchart: true,
    pie: true,
    xyChart: true,
    timeline: true,
  }); // 图表类型选择
  const [anchorUrl, setAnchorUrl] = useState(''); // 内部链接URL
  const [anchorText, setAnchorText] = useState(''); // 内部链接锚文本
  const [isAutoAnchorText, setIsAutoAnchorText] = useState(false); // 是否自动生成锚文本
  const [expandedKeywords, setExpandedKeywords] = useState(null); // 扩展关键词
  const [isExpandingKeywords, setIsExpandingKeywords] = useState(false); // 关键词扩展加载状态
  const [selectedExpandedKeywords, setSelectedExpandedKeywords] = useState([]); // 用户选中的扩展关键词
  const [outputLanguage, setOutputLanguage] = useState(() => localStorage.getItem('output_language') || 'zh-en'); // 输出语言

  // 新增界面状态
  const [targetRegion, setTargetRegion] = useState('United States');
  const [searchScope, setSearchScope] = useState('Global');
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);
  const [kbFiles, setKbFiles] = useState([]);
  const [keyPoints, setKeyPoints] = useState('');
  const [imageStyle, setImageStyle] = useState('Auto');
  const [externalBlacklist, setExternalBlacklist] = useState([]);
  const [newBlacklistUrl, setNewBlacklistUrl] = useState('');
  const [showWelcome, setShowWelcome] = useState(true); // 默认显示欢迎界面
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false); // 控制右侧面板显示
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true); // 控制左侧面板显示

  // 导航菜单状态
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [isBrandCenterExpanded, setIsBrandCenterExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // 自定义下拉菜单状态
  const [showWordCountDropdown, setShowWordCountDropdown] = useState(false);
  const [showToneDropdown, setShowToneDropdown] = useState(false);

  // 大纲生成模式
  const [isOutlineMode, setIsOutlineMode] = useState(false);

  // 应用主题
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', appTheme);
    localStorage.setItem('app-theme', appTheme);
  }, [appTheme]);

  // 检查分享链接
  React.useEffect(() => {
    const sharedData = parseShareLink();
    if (sharedData) {
      setBlogTheme(sharedData.title || '');
      setContent(sharedData.content || '');
    }
  }, []);

  // Mobile Responsive Logic
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(null); // 'left' or 'right' or null

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobilePanelOpen(null);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobilePanel = (panel) => {
    if (mobilePanelOpen === panel) {
      setMobilePanelOpen(null);
    } else {
      setMobilePanelOpen(panel);
    }
  };

  const handleSelectFiles = async () => {
    if (!window.electronAPI || !window.electronAPI.selectFiles) {
      alert('当前环境不支持文件选择功能');
      return;
    }
    try {
      const paths = await window.electronAPI.selectFiles();
      if (paths && paths.length > 0) {
        setKbFiles(prev => {
          const newFiles = paths.map(p => {
            // 简单获取文件名
            const name = p.split(/[/\\]/).pop();
            return { path: p, name };
          });
          // 去重
          const existingPaths = new Set(prev.map(f => f.path));
          const uniqueFiles = newFiles.filter(f => !existingPaths.has(f.path));
          return [...prev, ...uniqueFiles];
        });
      }
    } catch (error) {
      console.error('Failed to select files:', error);
    }
  };

  const handleRemoveFile = (pathToRemove) => {
    setKbFiles(prev => prev.filter(f => f.path !== pathToRemove));
  };

  const handleGenerate = async () => {
    if (!blogTheme) return alert('请告诉我您的文章主题或想法');
    if (!apiKey) return alert('请输入 API Key');

    const modelToUse = selectedModel === 'custom' ? customModelName : selectedModel;
    if (selectedModel === 'custom' && !customModelName) return alert('请输入自定义模型名称');

    setIsLoading(true);
    setShowWelcome(false); // 生成时隐藏欢迎界面
    setActiveTab('editor'); // 确保切换到编辑器
    setContent('## 🧠 正在智能分析您的需求...\n\nAI 正在从您的输入中提取最佳文章主题和 SEO 关键词，请稍候...');

    try {
      // 1. 智能意图分析
      let finalTheme = blogTheme;
      let finalKeywords = keywords;

      try {
        const analysisResult = await analyzeTopicIntent(apiKey, blogTheme);
        if (analysisResult && analysisResult.theme) {
          finalTheme = analysisResult.theme;
          finalKeywords = analysisResult.keywords;
          // 更新 UI 状态
          setBlogTheme(finalTheme);
          setKeywords(finalKeywords);
        }
      } catch (analysisError) {
        console.warn('Topic analysis failed, falling back to raw input:', analysisError);
      }

      // 如果还是没有关键词，尝试使用主题作为关键词
      if (!finalKeywords) finalKeywords = finalTheme;

      setContent(`## ✅ 分析完成\n\n**主题：** ${finalTheme}\n**关键词：** ${finalKeywords}\n\n---\n\n🚀 正在开始生成正文...`);

      setContent(`## ✅ 分析完成\n\n**主题：** ${finalTheme}\n**关键词：** ${finalKeywords}\n\n---\n\n🚀 正在开始生成正文...`);

      // 准备知识库内容
      let kbContent = [];
      if (useKnowledgeBase && kbFiles.length > 0) {
        if (window.electronAPI && window.electronAPI.readFile) {
          try {
            const results = await Promise.all(kbFiles.map(f => window.electronAPI.readFile(f.path)));
            kbContent = results
              .filter(r => r && r.success)
              .map(r => ({ name: r.name, content: r.content, path: r.path }));
            console.log(`Loaded ${kbContent.length} KB files`);
          } catch (e) {
            console.error('Error reading KB files:', e);
          }
        }
      }

      if (useStreaming) {
        // 流式输出 - 性能优化版 (Throttled Updates)
        let fullContent = '';
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 100; // 100ms 节流间隔

        await generateBlogContentStream(apiKey, {
          blogTheme: finalTheme,
          keywords: finalKeywords,
          wordCount,
          tone,
          includeTables,
          includeCharts,
          chartTypes,
          anchorUrl,
          anchorText,
          outputLanguage,
          // 新增参数
          targetRegion,
          searchScope,
          useKnowledgeBase,
          kbContent,
          keyPoints,
          imageStyle,
          externalBlacklist
        }, options, modelToUse, (chunk) => {
          fullContent += chunk;

          // 节流更新：避免由高频 chunk 导致的手机端 React 渲染卡死
          const now = Date.now();
          if (now - lastUpdateTime > UPDATE_INTERVAL) {
            setContent(fullContent);
            lastUpdateTime = now;
          }
        });

        // 确保最后的内容被更新
        setContent(fullContent);

        // 生成完成后插入图片
        if (autoInsertImages && pexelsApiKey) {
          console.log('🖼️ 开始插入图片...');
          console.log('Pexels API Key:', pexelsApiKey ? '已配置' : '未配置');
          console.log('自动插入图片:', autoInsertImages);

          // 优先使用 AI 扩展的关键词，如果没有则使用核心关键词
          const imageKeywords = selectedExpandedKeywords.length > 0
            ? selectedExpandedKeywords
            : finalKeywords.split(',').map(k => k.trim());

          console.log('图片搜索关键词:', imageKeywords);
          console.log('图片数量:', imageCount);

          const contentWithImages = await insertImagesIntoContent(fullContent, pexelsApiKey, imageKeywords, imageCount);
          console.log('图片插入完成');
          setContent(contentWithImages);
          fullContent = contentWithImages;
        } else {
          console.log('⚠️ 图片插入跳过 - autoInsertImages:', autoInsertImages, 'pexelsApiKey:', pexelsApiKey ? '已配置' : '未配置');
        }

        const newItem = { id: Date.now(), title: finalTheme, content: fullContent, keywords: finalKeywords };
        const newHistory = addHistoryItem(newItem);
        setHistory(newHistory);
      } else {
        // 普通生成
        let generatedText = await generateBlogContent(apiKey, {
          blogTheme: finalTheme,
          keywords: finalKeywords,
          wordCount,
          tone,
          includeTables,
          includeCharts,
          chartTypes,
          anchorUrl,
          anchorText,
          outputLanguage,
          // 新增参数
          targetRegion,
          searchScope,
          useKnowledgeBase,
          kbContent,
          keyPoints,
          imageStyle,
          externalBlacklist
        }, options, modelToUse);

        // 插入图片
        if (autoInsertImages && pexelsApiKey) {
          console.log('🖼️ [普通模式] 开始插入图片...');
          console.log('Pexels API Key:', pexelsApiKey ? '已配置' : '未配置');
          console.log('自动插入图片:', autoInsertImages);

          // 优先使用 AI 扩展的关键词，如果没有则使用核心关键词
          const imageKeywords = selectedExpandedKeywords.length > 0
            ? selectedExpandedKeywords
            : finalKeywords.split(',').map(k => k.trim());

          console.log('图片搜索关键词:', imageKeywords);
          console.log('图片数量:', imageCount);

          generatedText = await insertImagesIntoContent(generatedText, pexelsApiKey, imageKeywords, imageCount);
          console.log('图片插入完成');
        } else {
          console.log('⚠️ [普通模式] 图片插入跳过 - autoInsertImages:', autoInsertImages, 'pexelsApiKey:', pexelsApiKey ? '已配置' : '未配置');
        }

        setContent(generatedText);
        const newItem = { id: Date.now(), title: finalTheme, content: generatedText, keywords: finalKeywords };
        const newHistory = addHistoryItem(newItem);
        setHistory(newHistory);
      }
    } catch (error) {
      console.error('Generation Error:', error);
      const errorMessage = error.message || '';
      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
        setContent(`## ⚠️ API 配额超限 (Quota Exceeded)\n\n您当前的 Gemini API 配额已用完（通常发生在 Pro 模型频率过高时）。\n\n**建议解决方案：**\n1. **切换模型**：在左侧菜单切换到 **Gemini 2.5 Flash** 或 **Gemini 3 Flash**，它们的配额更高。\n2. **等待重试**：请等待约 60 秒后再重新生成。\n\n*详细错误信息：${errorMessage}*`);
      } else {
        setContent(`## ❌ 出错了\n\n${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 保存 API Key
  const handleApiKeyChange = (newKey) => {
    setApiKey(newKey);
    saveApiKey(newKey);
  };

  // 导出功能
  const handleExport = async (format) => {
    const filename = `${blogTheme || 'blog-post'}-${Date.now()}`;
    try {
      switch (format) {
        case 'markdown':
          exportAsMarkdown(content, `${filename}.md`);
          break;
        case 'pdf':
          await exportAsPDF('content-display', `${filename}.pdf`);
          break;
        case 'word':
          await exportAsWord(content, `${filename}.docx`);
          break;
      }
      setShowExportMenu(false);
    } catch (error) {
      alert(`导出失败: ${error.message}`);
    }
  };

  // 删除历史记录
  const handleDeleteHistory = (id) => {
    const newHistory = deleteHistoryItem(id);
    setHistory(newHistory);
  };

  // 搜索历史记录
  const handleSearchHistory = (query) => {
    setSearchQuery(query);
  };

  // 加载历史记录内容
  const handleLoadHistory = (item) => {
    setShowWelcome(false);
    setBlogTheme(item.title);
    setContent(item.content || '');
    setKeywords(item.keywords || '');
  };

  // 分析内容（使用专业 SEO 分析）
  const analyzeContent = () => {
    const fullAnalysis = getFullAnalysis(content, keywords);
    setAnalytics(fullAnalysis);
  };

  // 内容变化时自动分析
  React.useEffect(() => {
    if (content && content.length > 100) {
      analyzeContent();
    }
  }, [content, keywords]);

  // 续写内容
  const handleContinue = async () => {
    if (!apiKey) return alert('请输入 API Key');
    setIsLoading(true);
    try {
      const modelToUse = selectedModel === 'custom' ? customModelName : selectedModel;
      const continuedText = await continueContent(apiKey, content, modelToUse);
      setContent(content + '\n\n' + continuedText);
    } catch (error) {
      alert(`续写失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 重写内容
  const handleRewrite = async (style) => {
    if (!apiKey) return alert('请输入 API Key');
    setIsLoading(true);
    try {
      const modelToUse = selectedModel === 'custom' ? customModelName : selectedModel;
      const rewrittenText = await rewriteContent(apiKey, content, style, modelToUse);
      setContent(rewrittenText);
    } catch (error) {
      alert(`重写失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 复制内容到剪贴板
  const handleCopyContent = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      alert('✅ 内容已复制到剪贴板');
    } else {
      alert('❌ 复制失败，请手动复制');
    }
  };

  // 生成分享链接
  const handleGenerateShareLink = async () => {
    const link = generateShareLink(content, blogTheme);
    setQRCodeUrl(link);
    setShowQRCode(true);
    const success = await copyToClipboard(link);
    if (success) {
      alert('✅ 分享链接已复制到剪贴板，二维码已生成');
    } else {
      alert('❌ 生成失败');
    }
  };

  // 扩展关键词
  const handleExpandKeywords = async () => {
    if (!apiKey) return alert('请先输入 API Key');
    if (!keywords) return alert('请先输入核心关键词');

    setIsExpandingKeywords(true);
    try {
      const modelToUse = selectedModel === 'custom' ? customModelName : selectedModel;
      const expanded = await expandKeywords(apiKey, keywords, blogTheme, modelToUse);
      setExpandedKeywords(expanded);
      setSelectedExpandedKeywords([]); // 重置选中状态
    } catch (error) {
      alert(`关键词扩展失败: ${error.message}`);
      setExpandedKeywords(null);
    } finally {
      setIsExpandingKeywords(false);
    }
  };

  // 切换扩展关键词的选中状态
  const toggleExpandedKeyword = (keyword) => {
    setSelectedExpandedKeywords(prev => {
      if (prev.includes(keyword)) {
        return prev.filter(k => k !== keyword);
      } else {
        return [...prev, keyword];
      }
    });
  };

  // 应用选中的扩展关键词
  const applyExpandedKeywords = () => {
    if (selectedExpandedKeywords.length === 0) {
      return alert('请先选择要添加的关键词');
    }

    const currentKeywords = keywords.split(',').map(k => k.trim()).filter(k => k);
    const newKeywords = [...currentKeywords, ...selectedExpandedKeywords];
    const uniqueKeywords = [...new Set(newKeywords)]; // 去重

    setKeywords(uniqueKeywords.join(', '));
    setExpandedKeywords(null); // 关闭扩展面板
    setSelectedExpandedKeywords([]);
  };

  // 全选所有扩展关键词（智能切换）
  const selectAllExpandedKeywords = () => {
    if (!expandedKeywords) return;

    const allKeywords = [];
    Object.values(expandedKeywords).forEach(categoryKeywords => {
      if (Array.isArray(categoryKeywords)) {
        allKeywords.push(...categoryKeywords);
      }
    });

    // 如果已经全选，则取消全选；否则全选
    if (selectedExpandedKeywords.length === allKeywords.length) {
      setSelectedExpandedKeywords([]);
    } else {
      setSelectedExpandedKeywords(allKeywords);
    }
  };

  // 取消全选
  const deselectAllExpandedKeywords = () => {
    setSelectedExpandedKeywords([]);
  };

  // 选择某个类别的所有关键词
  const selectCategoryKeywords = (category) => {
    if (!expandedKeywords || !expandedKeywords[category]) return;

    const categoryKeywords = expandedKeywords[category];
    const newSelected = [...new Set([...selectedExpandedKeywords, ...categoryKeywords])];
    setSelectedExpandedKeywords(newSelected);
  };

  // 切换主题
  const toggleTheme = () => {
    setAppTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // 键盘快捷键（在所有函数定义之后）
  useKeyboardShortcuts({
    onSave: () => handleExport('markdown'),
    onExport: () => setShowExportMenu(true),
    onGenerate: handleGenerate,
    onContinue: handleContinue,
    onSearch: () => document.querySelector('.history-search')?.focus()
  });

  // 过滤历史记录
  const filteredHistory = searchQuery
    ? searchHistory(searchQuery)
    : history;

  return (
    <div className="app-container" data-theme={appTheme}>
      {/* Mobile Overlay */}
      <div
        className={`mobile-overlay ${mobilePanelOpen ? 'active' : ''}`}
        onClick={() => setMobilePanelOpen(null)}
      />

      {/* LEFT PANEL - API Settings */}
      <aside className={`left-panel ${!isLeftPanelOpen ? 'collapsed' : ''} ${mobilePanelOpen === 'left' ? 'mobile-visible' : ''}`}>
        <div className="panel-header">
          <div className="panel-title">⚙️ API 配置</div>
        </div>

        <div className="panel-content">
          <div className="input-group">
            <label>Google API Key</label>
            <input
              type="password"
              className="premium-input"
              placeholder="输入您的 Gemini API Key..."
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Pexels API Key (可选)</label>
            <input
              type="password"
              className="premium-input"
              placeholder="用于自动配图..."
              value={pexelsApiKey}
              onChange={(e) => {
                setPexelsApiKey(e.target.value);
                localStorage.setItem('pexels_api_key', e.target.value);
              }}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '5px', display: 'block' }}>
              🔗 在 <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>Pexels</a> 免费获取
            </small>
          </div>

          <div className="input-group">
            <label>请选择模型</label>
            <select
              className="premium-input"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (默认)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (高性能)</option>
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (实验版)</option>
              <option value="gemini-pro">Gemini 1.0 Pro (经典版)</option>
              <option value="custom">-- 自定义模型名称 --</option>
            </select>
          </div>

          {selectedModel === 'custom' && (
            <div className="input-group animate-slide-down">
              <label>自定义模型 ID</label>
              <input
                type="text"
                className="premium-input"
                placeholder="例如: gemini-1.0-pro"
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
              />
            </div>
          )}

          <div className="system-status">
            <div className="status-indicator online"></div>
            <span style={{ fontSize: '0.8rem' }}>
              {selectedModel === 'custom' ? (customModelName || '等待输入...') : selectedModel}
            </span>
          </div>

          {/* Navigation Menu */}
          <div className="nav-divider"></div>

          <nav className="nav-menu">
            <div
              className={`nav-item ${activeNavItem === 'home' ? 'active' : ''}`}
              onClick={() => {
                setActiveNavItem('home');
                setShowWelcome(true);
                setActiveTab('editor');
              }}
            >
              <span className="nav-icon">🏠</span>
              <span className="nav-text">首页</span>
            </div>

            <div
              className={`nav-item ${activeNavItem === 'my-content' ? 'active' : ''}`}
              onClick={() => {
                setActiveNavItem('my-content');
                setShowWelcome(false);
                setActiveTab('history');
              }}
            >
              <span className="nav-icon">📄</span>
              <span className="nav-text">我的内容</span>
            </div>

            <div className="nav-item-group">
              <div
                className={`nav-item ${isHistoryExpanded ? 'expanded' : ''}`}
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              >
                <span className="nav-icon">🕒</span>
                <span className="nav-text">历史对话</span>
                <ChevronRight size={16} className={`nav-chevron ${isHistoryExpanded ? 'rotated' : ''}`} />
              </div>
              {isHistoryExpanded && (
                <div className="nav-submenu">
                  {filteredHistory.slice(0, 5).map((item, index) => (
                    <div
                      key={index}
                      className="nav-subitem"
                      onClick={() => {
                        handleLoadHistory(item);
                        setIsHistoryExpanded(false);
                      }}
                    >
                      <span className="nav-subtext" style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.theme || '无标题'}
                      </span>
                    </div>
                  ))}
                  {filteredHistory.length > 5 && (
                    <div className="nav-subitem" onClick={() => setActiveTab('history')}>
                      <span className="nav-subtext" style={{ color: 'var(--accent-primary)' }}>查看全部...</span>
                    </div>
                  )}
                  {filteredHistory.length === 0 && (
                    <div className="nav-subitem">
                      <span className="nav-subtext" style={{ color: 'var(--text-muted)' }}>暂无历史</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div >
      </aside >

      {/* Left Panel Toggle Button - Always visible */}
      <button
        className="panel-expand-btn left"
        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        title={isLeftPanelOpen ? '收起 API 配置' : '展开 API 配置'}
      >
        {isLeftPanelOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* CENTER PANEL - Content Output */}
      <main className="center-panel">
        {/* Mobile bottom navigation bar */}
        <div className="mobile-bottom-bar">
          <button
            className={`mobile-nav-item ${mobilePanelOpen === 'left' ? 'active' : ''}`}
            onClick={() => toggleMobilePanel('left')}
          >
            <Settings size={20} className="mobile-nav-icon" />
            <span className="mobile-nav-label">配置</span>
          </button>

          <button
            className={`mobile-nav-item ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('editor');
              setMobilePanelOpen(null);
            }}
          >
            <FileText size={20} className="mobile-nav-icon" />
            <span className="mobile-nav-label">编辑</span>
          </button>

          <button
            className={`mobile-nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history');
              setMobilePanelOpen(null);
            }}
          >
            <History size={20} className="mobile-nav-icon" />
            <span className="mobile-nav-label">历史</span>
          </button>

          <button
            className={`mobile-nav-item ${mobilePanelOpen === 'right' ? 'active' : ''}`}
            onClick={() => toggleMobilePanel('right')}
          >
            <BarChart3 size={20} className="mobile-nav-icon" />
            <span className="mobile-nav-label">SEO</span>
          </button>
        </div>

        {isOutlineMode ? (
          <div className="welcome-view">
            {/* Header Navigation */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'color 0.2s'
            }}
              onClick={() => setIsOutlineMode(false)}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <ChevronLeft size={20} />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '2px' }}>大纲生成专家</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>基于您提供的内容以清晰大纲呈现。</div>
              </div>
            </div>

            <div className="welcome-content">
              <h1 className="welcome-title">把你的想法变成清晰的大纲。</h1>
              <p className="welcome-subtitle">根据你输入的主题生成文章大纲。</p>

              <div className="main-search-container glass-panel" style={{ marginTop: '40px' }}>
                <textarea
                  className="main-search-input"
                  placeholder="告诉我关主题或想法，例如：'我的话题是内容创作的10个AI工具'"
                  value={blogTheme}
                  onChange={(e) => setBlogTheme(e.target.value)}
                  rows={6}
                  style={{
                    minHeight: '200px',
                    fontSize: '0.95rem',
                    lineHeight: '1.6'
                  }}
                />

                <div className="search-actions" style={{ marginTop: '16px' }}>
                  <div className="search-left-actions">
                    <div className="lang-selector">
                      <Sparkles size={14} />
                      <select
                        value={outputLanguage}
                        onChange={(e) => {
                          setOutputLanguage(e.target.value);
                          localStorage.setItem('output_language', e.target.value);
                        }}
                      >
                        <option value="zh">简体中文</option>
                        <option value="en">English</option>
                        <option value="zh-en">中英双语</option>
                      </select>
                    </div>

                    <div className="lang-selector" style={{ minWidth: '160px' }}>
                      <span style={{ fontSize: '0.85rem' }}>🌐</span>
                      <select
                        value={targetRegion}
                        onChange={(e) => setTargetRegion(e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                      >
                        <option value="United States">United States</option>
                        <option value="China">China</option>
                        <option value="International">International</option>
                      </select>
                    </div>
                  </div>

                  <button
                    className="start-writing-btn"
                    onClick={() => {
                      setBlogTheme('为以下主题生成详细大纲：' + blogTheme);
                      handleGenerate();
                      setIsOutlineMode(false);
                    }}
                    disabled={isLoading}
                  >
                    <Sparkles size={16} />
                    <span>生成大纲</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : showWelcome ? (
          <div className="welcome-view">
            <div className="welcome-content">
              <h1 className="welcome-title">今天我们写点什么, A?</h1>
              <p className="welcome-subtitle">创造优质内容，在搜索引擎和 AI 搜索中脱颖而出</p>

              <div className="main-search-container glass-panel">
                <textarea
                  className="search-input"
                  placeholder="告诉我你的文章主题或想法，我会为你草拟一篇初稿"
                  value={blogTheme}
                  onChange={(e) => setBlogTheme(e.target.value)}
                ></textarea>

                <div className="search-actions">
                  <div className="search-left-actions">
                    <div className="lang-selector">
                      <Sparkles size={14} />
                      <select
                        value={outputLanguage}
                        onChange={(e) => {
                          setOutputLanguage(e.target.value);
                          localStorage.setItem('output_language', e.target.value);
                        }}
                      >
                        <option value="zh">简体中文 (Simplified Chinese)</option>
                        <option value="en">English (英语)</option>
                        <option value="zh-en">中英双语 (Bilingual: CN + EN)</option>
                        <option value="hi">हिन्दी (印地语)</option>
                        <option value="es">Español (西班牙语)</option>
                        <option value="fr">Français (法语)</option>
                        <option value="ar">العربية (阿拉伯语)</option>
                        <option value="bn">বাংলা (孟加拉语)</option>
                        <option value="pt">Português (葡萄牙语)</option>
                        <option value="ru">Русский (俄语)</option>
                        <option value="id">Bahasa Indonesia (印尼语)</option>
                      </select>
                    </div>
                    <div className="search-left-actions-row2" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>

                      {/* Word Count Editable Select */}
                      <div className="lang-selector" style={{ minWidth: '130px', position: 'relative', cursor: 'text' }} onClick={() => document.getElementById('word-count-input').focus()}>
                        <span style={{ fontSize: '0.85rem' }}>📝</span>
                        <input
                          id="word-count-input"
                          value={wordCount}
                          onChange={(e) => setWordCount(e.target.value)}
                          placeholder="字数"
                          style={{
                            fontSize: '0.9rem',
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            flex: 1,
                            width: '0',
                            minWidth: '0',
                            color: 'var(--text-primary)',
                            fontWeight: '600',
                            padding: 0
                          }}
                          onFocus={() => setShowWordCountDropdown(true)}
                          onBlur={() => setTimeout(() => setShowWordCountDropdown(false), 200)} // Delay hide to allow click
                        />
                        <div
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent input focus from closing dropdown immediately
                            setShowWordCountDropdown(!showWordCountDropdown);
                          }}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5 }}
                        >
                          <ChevronDown size={14} />
                        </div>

                        {showWordCountDropdown && (
                          <div className="custom-dropdown-menu glass-panel" style={{
                            position: 'absolute',
                            top: '120%',
                            left: 0,
                            width: '100%',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 1000,
                            padding: '4px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            background: 'var(--bg-card)'
                          }}>
                            {['2000', '3000', '4000', '5000'].map(opt => (
                              <div
                                key={opt}
                                className="dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent re-triggering focus
                                  setWordCount(opt);
                                  setShowWordCountDropdown(false);
                                }}
                                style={{ padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
                              >
                                {opt} 字
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tone Editable Select */}
                      <div className="lang-selector" style={{ minWidth: '130px', position: 'relative', cursor: 'text' }} onClick={() => document.getElementById('tone-input').focus()}>
                        <span style={{ fontSize: '0.85rem' }}>🎭</span>
                        <input
                          id="tone-input"
                          value={tone}
                          onChange={(e) => setTone(e.target.value)}
                          placeholder="语气"
                          style={{
                            fontSize: '0.9rem',
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            flex: 1,
                            width: '0',
                            minWidth: '0',
                            color: 'var(--text-primary)',
                            fontWeight: '600',
                            padding: 0
                          }}
                          onFocus={() => setShowToneDropdown(true)}
                          onBlur={() => setTimeout(() => setShowToneDropdown(false), 200)}
                        />
                        <div
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent input focus from closing dropdown immediately
                            setShowToneDropdown(!showToneDropdown);
                          }}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.5 }}
                        >
                          <ChevronDown size={14} />
                        </div>

                        {showToneDropdown && (
                          <div className="custom-dropdown-menu glass-panel" style={{
                            position: 'absolute',
                            top: '120%',
                            left: 0,
                            width: '160px', /* Make tone dropdown slightly wider */
                            maxHeight: '250px',
                            overflowY: 'auto',
                            zIndex: 1000,
                            padding: '4px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            background: 'var(--bg-card)'
                          }}>
                            {[
                              { val: 'Professional', label: '专业 (Professional)' },
                              { val: 'Casual', label: '轻松 (Casual)' },
                              { val: 'Friendly', label: '友好 (Friendly)' },
                              { val: 'Authoritative', label: '权威 (Authoritative)' },
                              { val: 'Humorous', label: '幽默 (Humorous)' },
                              { val: 'Empathetic', label: '共情 (Empathetic)' }
                            ].map(opt => (
                              <div
                                key={opt.val}
                                className="dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTone(opt.val);
                                  setShowToneDropdown(false);
                                }}
                                style={{ padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      className={`icon-btn-circle ${isRightPanelOpen ? 'active' : ''}`}
                      title="内容生成设置"
                      onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                    >
                      <Settings size={18} />
                    </button>
                  </div>

                  <button className="start-writing-btn" onClick={handleGenerate} disabled={isLoading}>
                    <Send size={16} />
                    <span>开始写作</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <>
            {/* Content Tabs */}
            <div className="content-tabs">
              <button
                className={`tab-button ${activeTab === 'editor' ? 'active' : ''}`}
                onClick={() => { setActiveTab('editor'); setShowStats(false); }}
              >
                📝 编辑器
              </button>
              <button
                className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => { setActiveTab('history'); setShowStats(false); }}
              >
                📚 历史记录
              </button>
              <button
                className={`tab-button ${showStats ? 'active' : ''}`}
                onClick={() => setShowStats(!showStats)}
              >
                📊 统计
              </button>
              <button
                className="tab-button"
                onClick={() => setShowWelcome(true)}
                style={{ marginLeft: 'auto', fontSize: '0.8rem' }}
              >
                🏠 返回首页
              </button>
            </div>

            {/* Content Header */}
            <header className="content-header glass-panel">
              <div className="path-info">应用 / {activeTab === 'editor' ? '编辑器' : activeTab === 'history' ? '历史记录' : '统计'} / {blogTheme || '未命名博客'}</div>
              <div className="header-actions">
                <button className="action-btn" onClick={toggleTheme} title="切换主题">
                  <Moon size={18} />
                </button>
                <button className="action-btn" onClick={analyzeContent} title="分析内容">
                  <Zap size={18} />
                </button>
                <button className="action-btn" onClick={handleCopyContent} title="复制内容">
                  <Send size={18} />
                </button>
                <div
                  className="export-dropdown"
                  onMouseEnter={() => setShowExportMenu(true)}
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <button className="premium-button">
                    <LogOut size={18} />
                    <span>导出</span>
                  </button>
                  {showExportMenu && (
                    <div className="export-menu" style={{ display: 'block' }}>
                      <button onClick={() => handleExport('markdown')}>
                        <span>📄</span> Markdown
                      </button>
                      <button onClick={() => handleExport('pdf')}>
                        <span>📃</span> PDF
                      </button>
                      <button onClick={() => handleExport('word')}>
                        <span>📃</span> Word
                      </button>
                      <hr style={{ margin: '5px 0', border: 'none', borderTop: '1px solid var(--border-subtle)' }} />
                      <button onClick={handleCopyContent}>
                        <span>📋</span> 复制内容
                      </button>
                      <button onClick={handleGenerateShareLink}>
                        <span>🔗</span> 分享链接
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Content Area */}
            <div className="editor-container" style={{ gap: 0 }}>
              {/* Editor Tab */}
              {
                activeTab === 'editor' && (
                  <div className="content-display glass-panel" id="content-display" style={{ position: 'relative' }}>
                    {isLoading && progress > 0 && (
                      <ProgressBar progress={progress} status={progressStatus} />
                    )}
                    <MarkdownWithCharts content={content} />
                  </div>
                )
              }

              {/* History Tab */}
              {
                activeTab === 'history' && (
                  <div className="history-view glass-panel" style={{ padding: '20px', overflowY: 'auto' }}>
                    <div className="section-title">最近生成</div>
                    <input
                      type="text"
                      className="history-search"
                      placeholder="搜索..."
                      value={searchQuery}
                      onChange={(e) => handleSearchHistory(e.target.value)}
                      style={{ width: '100%', marginBottom: '16px' }}
                    />
                    <div className="history-list">
                      {filteredHistory.map(item => (
                        <div key={item.id} className="history-item" onClick={() => handleLoadHistory(item)}>
                          <span className="truncate">{item.title}</span>
                          <Trash2
                            size={14}
                            className="delete-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistory(item.id);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }

              {/* Stats Panel */}
              {
                showStats && (
                  <StatsPanel history={history} />
                )
              }
            </div>
          </>
        )}
      </main>

      {/* RIGHT PANEL - Content Generation Settings */}
      <aside className={`right-panel ${!isRightPanelOpen ? 'collapsed' : ''}`}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} /> 内容生成设置
          </div>
          <button className="close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>

        <div className="panel-content">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            告诉 QuickCreator 您的文章生成规则，确保最终内容符合合规要求。
          </p>

          <div className="settings-section">
            <div className="section-label">基础设置</div>
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                目标区域 <span title="文章针对的地理区域">❓</span>
              </label>
              <select
                className="premium-input"
                value={targetRegion}
                onChange={(e) => setTargetRegion(e.target.value)}
              >
                <option value="United States">United States</option>
                <option value="China">China</option>
                <option value="International">International</option>
              </select>
            </div>

            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                搜索范围 <span title="AI 搜索信息的地理范围">❓</span>
              </label>
              <select
                className="premium-input"
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value)}
              >
                <option value="Global">全球搜索</option>
                <option value="Local">本地搜索</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <div className="section-label">内链设置</div>
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  锚文本 <span title="需要添加链接的关键词">❓</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>自动</span>
                  <label className="switch" style={{ transform: 'scale(0.8)' }}>
                    <input
                      type="checkbox"
                      checked={isAutoAnchorText}
                      onChange={(e) => {
                        setIsAutoAnchorText(e.target.checked);
                        if (e.target.checked) setAnchorText('');
                      }}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
              <input
                className="premium-input"
                type="text"
                value={anchorText}
                onChange={(e) => setAnchorText(e.target.value)}
                placeholder={isAutoAnchorText ? "AI 将根据上下文自动生成锚文本..." : "例如：点击这里了解更多"}
                disabled={isAutoAnchorText}
                style={isAutoAnchorText ? { background: 'var(--bg-hover)', color: 'var(--text-muted)', cursor: 'not-allowed' } : {}}
              />
            </div>
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                链接地址 <span title="点击锚文本跳转的 URL">❓</span>
              </label>
              <input
                className="premium-input"
                type="text"
                value={anchorUrl}
                onChange={(e) => setAnchorUrl(e.target.value)}
                placeholder="例如：https://example.com"
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="section-label">参考来源</div>
            <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 0 }}>
                知识库 <span title="使用您上传的知识库作为参考">❓</span>
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={useKnowledgeBase}
                  onChange={(e) => setUseKnowledgeBase(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {useKnowledgeBase && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {kbFiles.map((file, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px', background: 'var(--bg-input)', borderRadius: '6px', fontSize: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <FileText size={14} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={file.path}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(file.path)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                        title="移除文件"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleSelectFiles}
                    className="secondary-button"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
                  >
                    <Upload size={14} /> 添加参考文档 (PDF/TXT)
                  </button>
                </div>
              </div>
            )}
          </div>


          <div className="settings-section">
            <div className="section-label">增强功能</div>

            <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 0 }}>
                打字机模式 <span title="流式显示生成内容">❓</span>
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={useStreaming}
                  onChange={(e) => setUseStreaming(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 0 }}>
                包含数据表格 <span title="在文章中包含 Markdown 表格">❓</span>
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={includeTables}
                  onChange={(e) => setIncludeTables(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 0 }}>
                  包含数据图表 <span title="使用 Mermaid 渲染图表">❓</span>
                </label>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {includeCharts && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '4px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={chartTypes.flowchart}
                      onChange={() => setChartTypes(prev => ({ ...prev, flowchart: !prev.flowchart }))}
                    />
                    <span>流程图 (Flowchart)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={chartTypes.pie}
                      onChange={() => setChartTypes(prev => ({ ...prev, pie: !prev.pie }))}
                    />
                    <span>饼图 (Pie Chart)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={chartTypes.xyChart}
                      onChange={() => setChartTypes(prev => ({ ...prev, xyChart: !prev.xyChart }))}
                    />
                    <span style={{ flex: 1 }}>数据柱状/折线图 (XY Chart)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={chartTypes.timeline}
                      onChange={() => setChartTypes(prev => ({ ...prev, timeline: !prev.timeline }))}
                    />
                    <span>时间轴 (Timeline)</span>
                  </label>
                </div>
              )}
            </div>

            <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 0 }}>
                自动插入 Pexels 图片 <span title="根据关键词从 Pexels 获取配图">❓</span>
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={autoInsertImages}
                  onChange={(e) => setAutoInsertImages(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <div className="section-label">外部域名黑名单 ({externalBlacklist.length}/100)</div>
            <div className="blacklist-container" style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center'
            }}>
              {externalBlacklist.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>尚未添加任何域名。</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0', textAlign: 'left' }}>
                  {externalBlacklist.map((domain, index) => (
                    <li key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                      {domain}
                      <button
                        onClick={() => setExternalBlacklist(prev => prev.filter((_, i) => i !== index))}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >✕</button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                className="secondary-button"
                style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem' }}
                onClick={() => {
                  const domain = prompt('请输入要屏蔽的域名 (例如: example.com):');
                  if (domain) setExternalBlacklist([...externalBlacklist, domain]);
                }}
              >
                + 添加
              </button>
            </div>
          </div>
        </div >
      </aside >

      {/* QR Code Modal */}
      {
        showQRCode && (
          <div className="qr-modal" onClick={() => setShowQRCode(false)}>
            <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="qr-modal-header">
                <h3>🔗 分享二维码</h3>
                <button className="close-btn" onClick={() => setShowQRCode(false)}>×</button>
              </div>
              <div className="qr-modal-body">
                <QRCodeSVG
                  value={qrCodeUrl}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
                <p className="qr-hint">扫描二维码分享文章</p>
                <div className="qr-url">{qrCodeUrl}</div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default App;
