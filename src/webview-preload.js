'use strict';

const { ipcRenderer } = require('electron');

// 在 bilibili 页面内部运行：
//  - 普通视频页(www.bilibili.com/video/...)：首次播放自动进入"网页全屏"，
//    并监听全屏状态变化通知宿主（宿主据此缩放，修正小窗布局）
//  - 直播页(live.bilibili.com/房间号)：播放后自动进入"网页全屏"，
//    从而铺满窗口并收起右侧弹幕/聊天栏
(function () {
  const isLive = location.hostname === 'live.bilibili.com' && /\/\d+/.test(location.pathname);

  // ---------- 通用工具 ----------
  function clickWebFullButton() {
    // 1) 优先用无障碍标签（视频/直播通用）
    let btn = document.querySelector('[aria-label="网页全屏"]');
    // 2) 视频播放器已知按钮
    if (!btn) btn = document.querySelector('.bpx-player-ctrl-web');
    // 3) 按控制栏内的文字标签查找（对类名变动更健壮）
    if (!btn) {
      const scope = document.querySelectorAll(
        '.web-player-controller-wrap *, [class*="controller"] *, [class*="control"] *'
      );
      for (let i = 0; i < scope.length; i++) {
        if ((scope[i].textContent || '').trim() === '网页全屏') {
          btn = scope[i].closest('div,button,span') || scope[i];
          break;
        }
      }
    }
    if (btn) { btn.click(); return true; }
    return false;
  }

  // ---------- 视频页：监听 bpx 播放器全屏状态 ----------
  function setupVideo() {
    let container = null;
    let lastScreen = null;
    function watch() {
      const c = document.querySelector('.bpx-player-container');
      if (!c || c === container) return;
      container = c;
      lastScreen = c.getAttribute('data-screen');
      new MutationObserver(function () {
        const s = c.getAttribute('data-screen');
        if (s === lastScreen) return;
        lastScreen = s;
        ipcRenderer.sendToHost(s === 'web' ? 'web-fullscreen-entered' : 'web-fullscreen-exited');
      }).observe(c, { attributes: true, attributeFilter: ['data-screen'] });
    }
    let entered = false;
    function bind() {
      const v = document.querySelector('video');
      if (!v || v.dataset.bilipeekBound) return;
      v.dataset.bilipeekBound = '1';
      const go = function () {
        if (entered) return; entered = true;
        setTimeout(clickWebFullButton, 500);
      };
      v.addEventListener('playing', go, { once: true });
      if (!v.paused) go();
    }
    let n = 0;
    const t = setInterval(function () { n++; watch(); bind(); if (n > 60) clearInterval(t); }, 500);
  }

  // ---------- 直播页：播放后自动网页全屏 ----------
  function setupLive() {
    let entered = false;
    let n = 0;
    const t = setInterval(function () {
      n++;
      const v = document.querySelector('video');
      const playing = v && !v.paused && !v.ended && v.currentTime > 0;
      if (!entered && playing) {
        if (clickWebFullButton()) {
          entered = true;
          // 直播无法可靠监听全屏属性，直接通知宿主按小窗宽度缩放
          setTimeout(function () { ipcRenderer.sendToHost('web-fullscreen-entered'); }, 400);
        }
      }
      if (entered || n > 60) clearInterval(t); // 最长尝试约 30s
    }, 500);
  }

  window.addEventListener('DOMContentLoaded', function () {
    if (isLive) setupLive(); else setupVideo();
  });
})();