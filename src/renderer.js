'use strict';

const wv = document.getElementById('wv');
const HOME = 'https://www.bilibili.com';

// 注意：webview 的新窗口拦截在主进程处理（main.js），点击视频进入正常播放页

// 输入 BV号/链接，跳转到对应视频播放页
function jumpToVideo(text) {
  text = (text || '').trim();
  if (!text) return;
  const bvid = (text.match(/BV[0-9A-Za-z]{8,}/) || [])[0];
  let aid = null;
  if (!bvid) {
    const m = text.match(/av(\d+)/i) || (/^\d+$/.test(text) ? [null, text] : null);
    if (m) aid = m[1];
  }
  if (bvid) {
    wv.loadURL('https://www.bilibili.com/video/' + bvid);
  } else if (aid) {
    wv.loadURL('https://www.bilibili.com/video/av' + aid);
  }
}

const bvInput = document.getElementById('bv');
document.getElementById('bv-go').addEventListener('click', () => {
  jumpToVideo(bvInput.value);
});
bvInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') jumpToVideo(bvInput.value);
});

// 导航
document.getElementById('nav-back').addEventListener('click', () => {
  if (wv.canGoBack()) wv.goBack();
});
document.getElementById('nav-home').addEventListener('click', () => {
  wv.loadURL(HOME);
});
document.getElementById('nav-reload').addEventListener('click', () => {
  wv.reload();
});

// 尺寸预设
document.querySelectorAll('button.size').forEach((btn) => {
  btn.addEventListener('click', () => {
    const w = parseInt(btn.dataset.w, 10);
    const h = parseInt(btn.dataset.h, 10) + 30; // 加上控制条高度
    window.api.setSize(w, h);
  });
});

// 置顶开关
const topBtn = document.getElementById('top');
topBtn.addEventListener('click', async () => {
  const on = await window.api.toggleTop();
  topBtn.classList.toggle('active', on);
});

// 老板键（手动触发）
document.getElementById('boss').addEventListener('click', () => {
  window.api.bossHide();
});

// 最小化 / 关闭
document.getElementById('min').addEventListener('click', () => window.api.minimize());
document.getElementById('close').addEventListener('click', () => window.api.close());

// 视频页开始播放后自动进入"网页全屏"由 webview-preload.js 负责。
// B 站播放器在宽度较小时会切换到紧凑布局，导致进度条挤压/溢出显示异常。
// 解决：进入网页全屏时对 webview 做浏览器级缩小，使页面"看到"的视口足够宽
// （采用桌面完整播放器布局），物理上仍适配小窗；退出全屏时恢复 1:1。
const TARGET_WIDTH = 820; // 播放器所需的等效视口宽度
let webFull = false;

function applyPlayerZoom() {
  const w = wv.getBoundingClientRect().width;
  const z = w >= TARGET_WIDTH ? 1 : Math.max(0.45, w / TARGET_WIDTH);
  wv.setZoomFactor(z);
}

function nudgeWebview() {
  wv.style.width = 'calc(100% - 1px)';
  setTimeout(() => { wv.style.width = '100%'; }, 60);
}

wv.addEventListener('ipc-message', (e) => {
  if (e.channel === 'web-fullscreen-entered') {
    webFull = true;
    applyPlayerZoom();
    nudgeWebview();
    setTimeout(nudgeWebview, 300);
  } else if (e.channel === 'web-fullscreen-exited') {
    webFull = false;
    wv.setZoomFactor(1);
  }
});

// 窗口尺寸变化时，若处于网页全屏则重新计算缩放
window.addEventListener('resize', () => {
  if (webFull) applyPlayerZoom();
});

// 整页跳转后重置缩放状态（离开视频/直播页时恢复 1:1）
wv.addEventListener('did-navigate', () => {
  webFull = false;
  wv.setZoomFactor(1);
});

// 主进程要求暂停媒体（老板键触发）
window.api.onPauseMedia(() => {
  wv.executeJavaScript(
    'document.querySelectorAll("video,audio").forEach(function(m){try{m.pause();}catch(e){}});',
    true
  ).catch(() => {});
});

// 初始化控制条状态
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const st = await window.api.getState();
    topBtn.classList.toggle('active', !!st.alwaysOnTop);
    document.getElementById('boss').title = '老板键：隐藏 (' + st.bossKey + ')';
  } catch (e) { /* ignore */ }
});
