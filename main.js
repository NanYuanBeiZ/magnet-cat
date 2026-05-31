const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const axios = require('axios');
const CloudSync = require('./cloudSync');

let mainWindow = null;
let debugWindow = null;
let cloudSync = null;
let currentSearchController = null;
let syncTimer = null;

const searchUrl = 'https://clm50.top/search';
const detailUrlBase = 'https://clm50.top';

const linkRegex = /<div class="Search_title_wrapper"[^>]*>.*?<a[^>]+href="(\/information\/[^"]+)"[^>]*>(.*?)<\/a>/gs;
const sizeRegex = /<em>文件大小：<\/em>([\d.]+)\s*([GMK]B)/g;
const magnetRegex = /<input id="Information_copy_text" value="(magnet:\?xt=urn:btih:[^"]+)"/;

const log = (level, message) => {
  const time = new Date().toISOString();
  const logStr = `[${time}] [${level.toUpperCase()}] ${message}`;
  console.log(logStr);
  if (debugWindow) {
    debugWindow.webContents.send('debug-log', logStr);
  }
};

function generateMagnetCount(magnetHash) {
  let hash = 0;
  for (let i = 0; i < magnetHash.length; i++) {
    const charCode = magnetHash.charCodeAt(i);
    hash = ((hash << 5) - hash) + charCode;
    hash = hash & hash;
  }
  return Math.abs(hash % 50) + 1;
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1000,
        minHeight: 700,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (debugWindow) {
      debugWindow.close();
    }
    app.quit();
  });

  ipcMain.handle('minimize', () => mainWindow.minimize());
  ipcMain.handle('maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  });
  ipcMain.handle('close', () => mainWindow.close());
  ipcMain.handle('isMaximized', () => mainWindow.isMaximized());
}

function createDebugWindow() {
  if (debugWindow) return;
  debugWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Debug Console',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  debugWindow.loadFile('debug.html');
  debugWindow.on('closed', () => {
    debugWindow = null;
  });
}

async function searchMagnet(keyword) {
  try {
    log('info', `开始搜索: ${keyword}`);
    if (currentSearchController) {
      currentSearchController.abort();
    }

    let encodedKeyword = Buffer.from(keyword, 'utf8').toString('base64');
    encodedKeyword = encodedKeyword.replace(/=+$/, '');

    const startTime = Date.now();
    const controller = new AbortController();
    currentSearchController = controller;

    const searchResponse = await axios.get(searchUrl, {
      params: { word: encodedKeyword },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://clm50.top/'
      },
      timeout: 30000,
      signal: controller.signal
    });

    const html = searchResponse.data;

    const links = [];
    let match;
    linkRegex.lastIndex = 0;
    while ((match = linkRegex.exec(html)) !== null) {
      links.push({
        href: match[1],
        title: match[2].replace(/<[^>]+>/g, '').trim()
      });
    }

    const sizes = [];
    sizeRegex.lastIndex = 0;
    while ((match = sizeRegex.exec(html)) !== null) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      let bytes = value;
      if (unit === 'GB') bytes = value * 1024 * 1024;
      else if (unit === 'MB') bytes = value * 1024;
      sizes.push({
        text: `${value} ${unit}`,
        bytes: bytes
      });
    }

    if (links.length === 0 || sizes.length === 0) {
      log('warn', '未找到搜索结果');
      mainWindow.webContents.send('search-error', '未找到任何搜索结果');
      return;
    }

    const total = Math.min(links.length, sizes.length);
    mainWindow.webContents.send('search-total', total);
    log('info', `找到 ${total} 个结果`);

    let success = 0;
    let fail = 0;

    for (let i = 0; i < total; i++) {
      try {
        if (controller.signal.aborted) break;

        const link = links[i];
        const size = sizes[i];
        const detailUrl = detailUrlBase + link.href;

        const detailResponse = await axios.get(detailUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://clm50.top/'
          },
          timeout: 15000,
          signal: controller.signal
        });

        const detailHtml = detailResponse.data;
        const magnetMatch = detailHtml.match(magnetRegex);
        if (magnetMatch) {
          const magnet = magnetMatch[1];
          const magnetCount = generateMagnetCount(magnet);
          const result = {
            title: link.title,
            size: size.text,
            sizeBytes: size.bytes,
            magnet: magnet,
            magnetCount: magnetCount
          };
          mainWindow.webContents.send('search-result', result);
          success++;
          log('debug', `成功获取: ${link.title.substring(0, 30)}...`);
        } else {
          fail++;
          log('warn', `未找到磁力链接: ${link.href}`);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          fail++;
          log('error', `获取详情页失败: ${err.message}`);
        }
      }

      if (i < total - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const duration = Date.now() - startTime;
    mainWindow.webContents.send('search-complete', { success, fail, duration });
    log('info', `搜索完成: 成功 ${success}, 失败 ${fail}, 耗时 ${duration}ms`);
  } catch (err) {
    if (err.name !== 'AbortError') {
      log('error', `搜索失败: ${err.message}`);
      mainWindow.webContents.send('search-error', err.message);
    }
  }
}

async function initCloudSync() {
  cloudSync = new CloudSync(app.getPath('userData'));
  await cloudSync.loadSettings();
}

function setupIPCHandlers() {
  ipcMain.on('search', (event, keyword) => {
    searchMagnet(keyword);
  });

  ipcMain.on('search-cancel', () => {
    if (currentSearchController) {
      currentSearchController.abort();
      currentSearchController = null;
    }
  });

  ipcMain.handle('cloud-load-settings', async () => {
    return await cloudSync.loadSettings();
  });

  ipcMain.handle('cloud-auto-unlock', async () => {
    try {
      const settings = cloudSync.settings;
      if (!settings || !settings.enc_token || !settings.enc_pwd) {
        return { success: false };
      }
      const password = await cloudSync.decryptWithMachineKey(settings.enc_pwd);
      const salt = Buffer.from(settings.pwd_salt, 'base64');
      const key = await cloudSync.deriveKey(password, salt);
      const tokenEnvelope = JSON.parse(settings.enc_token);
      const tokenEnvelopeWithSalt = { ...tokenEnvelope, s: settings.pwd_salt };
      const token = JSON.stringify(tokenEnvelopeWithSalt);
      const decrypted = await cloudSync.decryptData(tokenEnvelope, key);
      return {
        success: true,
        token: decrypted,
        password: password,
        repo: settings.repo
      };
    } catch (err) {
      cloudSync.log('error', `自动解锁失败: ${err.message}`);
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('cloud-unlock', async (event, { password }) => {
    try {
      const settings = cloudSync.settings;
      if (!settings || !settings.pwd_hash || !settings.pwd_salt) {
        return { success: false };
      }
      const valid = await cloudSync.verifyPassword(password, settings.pwd_salt, settings.pwd_hash);
      if (!valid) {
        return { success: false, message: '密码错误' };
      }
      const salt = Buffer.from(settings.pwd_salt, 'base64');
      const key = await cloudSync.deriveKey(password, salt);
      const tokenEnvelope = JSON.parse(settings.enc_token);
      const decrypted = await cloudSync.decryptData(tokenEnvelope, key);
      return {
        success: true,
        token: decrypted,
        repo: settings.repo
      };
    } catch (err) {
      cloudSync.log('error', `密码解锁失败: ${err.message}`);
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('cloud-save-settings', async (event, { repo, token, password, isFirstSave }) => {
    try {
      const { salt: saltStr, hash } = await cloudSync.hashPassword(password);
      const salt = Buffer.from(saltStr, 'base64');
      const key = await cloudSync.deriveKey(password, salt);
      const tokenEnvelope = cloudSync.encryptData(token, key);
      delete tokenEnvelope.s;
      const pwdEnvelope = await cloudSync.encryptWithMachineKey(password);

      const settings = {
        repo: repo,
        pwd_salt: saltStr,
        pwd_hash: hash,
        enc_token: JSON.stringify(tokenEnvelope),
        enc_pwd: JSON.stringify(pwdEnvelope),
        lastSyncTime: cloudSync.settings?.lastSyncTime || ''
      };

      await cloudSync.saveSettings(settings);

      if (isFirstSave) {
        cloudSync.log('info', '首次保存，拉取云端数据');
      }
      return { success: true };
    } catch (err) {
      cloudSync.log('error', `保存设置失败: ${err.message}`);
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('cloud-test-connection', async (event, { repo, token }) => {
    return await cloudSync.testConnection({ repo, token });
  });

  ipcMain.handle('cloud-sync', async (event, { direction, password, data }) => {
    try {
      const result = await cloudSync.loadSettings();
      const settings = result.settings;
      if (!settings.repo) {
        return { success: false, message: '未配置云同步' };
      }

      const salt = Buffer.from(settings.pwd_salt, 'base64');
      const key = await cloudSync.deriveKey(password, salt);
      const tokenEnvelope = JSON.parse(settings.enc_token);
      const token = await cloudSync.decryptData(tokenEnvelope, key);

      if (direction === 'push') {
        let lastError = null;
        for (let i = 0; i < 3; i++) {
          const res = await cloudSync.pushData({ ...settings, token }, password, data);
          if (res.success) {
            return res;
          }
          lastError = res;
          await new Promise(r => setTimeout(r, 2000));
        }
        return lastError;
      } else {
        return await cloudSync.pullData({ ...settings, token }, password);
      }
    } catch (err) {
      cloudSync.log('error', `同步失败: ${err.message}`);
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('cloud-is-configured', async () => {
    const result = await cloudSync.loadSettings();
    return !!(result.settings?.repo && result.settings?.pwd_hash);
  });

  ipcMain.handle('cloud-get-status', async () => {
    const result = await cloudSync.loadSettings();
    return {
      configured: !!(result.settings?.repo && result.settings?.pwd_hash),
      lastSyncTime: result.settings?.lastSyncTime || ''
    };
  });

  ipcMain.handle('cloud-favorite-changed', async (event, { data, password }) => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const result = await cloudSync.loadSettings();
      const settings = result.settings;
      if (!settings?.repo || !settings?.pwd_hash) return;
      try {
        const salt = Buffer.from(settings.pwd_salt, 'base64');
        const key = await cloudSync.deriveKey(password, salt);
        const tokenEnvelope = JSON.parse(settings.enc_token);
        const token = await cloudSync.decryptData(tokenEnvelope, key);
        await cloudSync.pushData({ ...settings, token }, password, data);
      } catch (err) {
        cloudSync.log('error', `自动推送失败: ${err.message}`);
      }
    }, 3000);
  });

  ipcMain.handle('cloud-reset-password', async () => {
    try {
      const result = await cloudSync.loadSettings();
      const settings = result.settings;
      if (!settings) return { success: true };
      delete settings.pwd_salt;
      delete settings.pwd_hash;
      delete settings.enc_token;
      delete settings.enc_pwd;
      await cloudSync.saveSettings(settings);
      return { success: true };
    } catch (err) {
      cloudSync.log('error', `重置密码失败: ${err.message}`);
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('cloud-clear-all-data', async () => {
    return await cloudSync.clearAllData();
  });

  ipcMain.on('open-debug', () => {
    createDebugWindow();
  });

  ipcMain.on('open-gitee-help', () => {
    shell.openExternal('https://gitee.com/profile/personal_access_tokens');
  });
}

app.whenReady().then(async () => {
  await initCloudSync();
  setupIPCHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
