'use strict';

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
  nativeImage
} = require('electron');
const path = require('path');
const store = require('./store');

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const MIN_SIZE = { width: 320, height: 240 };
const MAX_SIZE = { width: 1280, height: 720 };

let win = null;
let tray = null;
let settings = store.read();
let hiddenByBossKey = false;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function createWindow() {
  const b = settings.bounds || {};
  win = new BrowserWindow({
    width: clamp(b.width || 480, MIN_SIZE.width, MAX_SIZE.width),
    height: clamp(b.height || 300, MIN_SIZE.height, MAX_SIZE.height),
    x: b.x,
    y: b.y,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    maxWidth: MAX_SIZE.width,
    maxHeight: MAX_SIZE.height,
    frame: false,
    resizable: true,
    alwaysOnTop: !!settings.alwaysOnTop,
    skipTaskbar: false,
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  // 为 webview 注入独立的 preload（在 bilibili 页面内运行）
  win.webContents.on('will-attach-webview', (_event, wp) => {
    wp.preload = path.join(__dirname, 'webview-preload.js');
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  // 保存窗口位置/尺寸
  const saveBounds = () => {
    if (!win || win.isDestroyed()) return;
    if (hiddenByBossKey) return; // 隐藏期间不记录
    settings.bounds = win.getBounds();
    store.write(settings);
  };
  win.on('resize', saveBounds);
  win.on('move', saveBounds);

  win.on('closed', () => {
    win = null;
  });
}

// 向 webview 内的所有 <video> 注入暂停
function pauseVideos() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('boss:pause-media');
}

function applyBossHide() {
  if (!win) return;
  hiddenByBossKey = true;
  win.webContents.audioMuted = true;
  pauseVideos();
  win.hide();
  win.setSkipTaskbar(true);
}

function applyBossShow() {
  if (!win) return;
  hiddenByBossKey = false;
  win.setSkipTaskbar(false);
  win.show();
  win.focus();
  win.webContents.audioMuted = false;
}

function toggleBoss() {
  if (!win) return;
  if (win.isVisible() && !hiddenByBossKey) {
    applyBossHide();
  } else {
    applyBossShow();
  }
}

function registerBossKey(accelerator) {
  globalShortcut.unregisterAll();
  const acc = accelerator || settings.bossKey;
  const ok = globalShortcut.register(acc, toggleBoss);
  if (ok) {
    settings.bossKey = acc;
    store.write(settings);
  }
  return ok;
}

function createTray() {
  let img = nativeImage.createFromPath(
    path.join(__dirname, '..', 'assets', 'icon.ico')
  );
  if (img.isEmpty()) {
    img = nativeImage.createEmpty();
  }
  tray = new Tray(img);
  tray.setToolTip('BiliPeek');
  const menu = Menu.buildFromTemplate([
    { label: '显示/隐藏', click: () => toggleBoss() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => applyBossShow());
}

// ---------- IPC ----------
ipcMain.on('win:minimize', () => win && win.minimize());
ipcMain.on('win:close', () => app.quit());

ipcMain.on('win:set-size', (_e, { width, height }) => {
  if (!win) return;
  win.setSize(
    clamp(width, MIN_SIZE.width, MAX_SIZE.width),
    clamp(height, MIN_SIZE.height, MAX_SIZE.height)
  );
});

ipcMain.handle('win:toggle-top', () => {
  if (!win) return settings.alwaysOnTop;
  settings.alwaysOnTop = !win.isAlwaysOnTop();
  win.setAlwaysOnTop(settings.alwaysOnTop);
  store.write(settings);
  return settings.alwaysOnTop;
});

ipcMain.handle('win:get-state', () => ({
  alwaysOnTop: win ? win.isAlwaysOnTop() : settings.alwaysOnTop,
  bossKey: settings.bossKey
}));

ipcMain.on('boss:hide', () => applyBossHide());

ipcMain.handle('boss:set-key', (_e, accelerator) => registerBossKey(accelerator));

// ---------- lifecycle ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => applyBossShow());

  // 拦截 webview 内的新窗口：不弹新窗口，改在同一 webview 内打开
  app.on('web-contents-created', (_e, contents) => {
    if (contents.getType() !== 'webview') return;
    contents.setWindowOpenHandler(({ url }) => {
      if (url && !/^about:/i.test(url)) contents.loadURL(url);
      return { action: 'deny' };
    });
  });

  app.whenReady().then(() => {
    // 设置全局 UA，避免 bilibili 降级页面
    app.userAgentFallback = CHROME_UA;
    createWindow();
    createTray();
    registerBossKey(settings.bossKey);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
