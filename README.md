# Gemini Blog Pro 🚀

一款集成 Google Gemini API 的智能力 B2B 工业博客生成工具。支持 SEO 深度优化、多种图表生成（Mermaid）以及知识库集成。

## 核心功能
- **智能 SEO 写作**：基于 20 年 B2B 经验的首席内容官角色模型。
- **双端支持**：Electron 桌面端与 Web 端。
- **流式输出**：实时预览文章生成过程。
- **知识库集成**：支持上传 PDF/图片/文档作为写作参考。
- **自动图表**：自动生成流程图、饼图等可视化数据。

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
将 `.env.example` 重命名为 `.env`，并填入您的 `VITE_GEMINI_API_KEY`。

### 3. 本地运行
- **Web 应用**: `npm run dev`
- **Electron 应用**: `npm run electron:dev`

## 部署到 Vercel
项目已内置 `vercel.json` 配置，可直接连接 GitHub 仓库实现自动部署。

---
*Powered by Google Gemini 2.5 Flash*