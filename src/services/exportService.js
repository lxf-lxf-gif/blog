import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

/**
 * Export Service - 统一的导出服务
 */

// 检测是否在 Electron 环境中
const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI && window.electronAPI.saveFile;
};

// 导出为 Markdown 文件
export const exportAsMarkdown = async (content, filename = 'blog-post.md') => {
    if (isElectron()) {
        // Electron 环境：使用原生文件对话框
        const result = await window.electronAPI.saveFile({
            content: content,
            defaultPath: filename,
            filters: [
                { name: 'Markdown Files', extensions: ['md'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (!result.success && !result.canceled) {
            throw new Error(result.error || '保存失败');
        }
    } else {
        // 浏览器环境：使用 file-saver
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, filename);
    }
};

// 导出为 PDF 文件
export const exportAsPDF = async (elementId, filename = 'blog-post.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error('找不到要导出的元素');
    }

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a0f'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const imgWidth = 210; // A4 宽度
    const pageHeight = 297; // A4 高度
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    if (isElectron()) {
        // Electron 环境：使用原生文件对话框
        const pdfBlob = pdf.output('blob');
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const result = await window.electronAPI.saveFile({
            content: Array.from(uint8Array),
            defaultPath: filename,
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (!result.success && !result.canceled) {
            throw new Error(result.error || '保存失败');
        }
    } else {
        // 浏览器环境
        pdf.save(filename);
    }
};

// 导出为 Word 文件
export const exportAsWord = async (content, filename = 'blog-post.docx') => {
    // 简单的 Markdown 解析为 Word 段落
    const lines = content.split('\n');
    const paragraphs = [];

    lines.forEach(line => {
        if (line.startsWith('# ')) {
            paragraphs.push(
                new Paragraph({
                    text: line.replace('# ', ''),
                    heading: HeadingLevel.HEADING_1
                })
            );
        } else if (line.startsWith('## ')) {
            paragraphs.push(
                new Paragraph({
                    text: line.replace('## ', ''),
                    heading: HeadingLevel.HEADING_2
                })
            );
        } else if (line.startsWith('### ')) {
            paragraphs.push(
                new Paragraph({
                    text: line.replace('### ', ''),
                    heading: HeadingLevel.HEADING_3
                })
            );
        } else if (line.trim()) {
            paragraphs.push(
                new Paragraph({
                    children: [new TextRun(line)]
                })
            );
        }
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: paragraphs
        }]
    });

    const blob = await Packer.toBlob(doc);

    if (isElectron()) {
        // Electron 环境：使用原生文件对话框
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const result = await window.electronAPI.saveFile({
            content: Array.from(uint8Array),
            defaultPath: filename,
            filters: [
                { name: 'Word Documents', extensions: ['docx'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (!result.success && !result.canceled) {
            throw new Error(result.error || '保存失败');
        }
    } else {
        // 浏览器环境
        saveAs(blob, filename);
    }
};
