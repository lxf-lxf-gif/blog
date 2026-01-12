const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#0a0a0a',
    show: false,
    icon: path.join(__dirname, 'icon.png')
  });

  // 开发环境加载 Vite 服务器，生产环境加载打包后的文件
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 选择文件
ipcMain.handle('select-files', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Documents', extensions: ['txt', 'md', 'pdf', 'json', 'csv'] }
    ]
  });
  return result.canceled ? [] : result.filePaths;
});

// 读取文件
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath);
    return {
      success: true,
      content: content.toString('base64'), // 统一返回 Base64，前端按需处理
      path: filePath,
      name: path.basename(filePath)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 保存文件对话框
ipcMain.handle('save-file', async (event, { content, defaultPath, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters
  });

  if (!result.canceled && result.filePath) {
    try {
      if (typeof content === 'string') {
        fs.writeFileSync(result.filePath, content, 'utf-8');
      } else {
        // 处理 Buffer 或 Blob 数据
        fs.writeFileSync(result.filePath, Buffer.from(content));
      }
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, canceled: true };
});
