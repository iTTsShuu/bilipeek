# BiliPeek

> 桌面 Bilibili 小窗播放器 —— 无边框置顶悬浮窗，看视频 / 看直播，老板键一键隐藏。

BiliPeek 是一个基于 Electron 的 Windows 桌面小工具，用一个小巧、置顶、尺寸可调的悬浮窗口访问
bilibili。适合边工作边摸鱼看视频/直播，一个快捷键即可瞬间隐藏画面并静音。

## 功能特性

- **无边框悬浮小窗**：窗口置顶，自定义控制条，尺寸在 320×240 ~ 1280×720 间自由拖拽，附 S/M/L 预设。
- **看视频 / 看直播**：内嵌完整 bilibili 网站，登录状态持久保存。
- **自动窗口内全屏**：视频/直播开始播放后自动进入"网页全屏"铺满小窗；小窗下自动缩放，进度条正常可拖动，直播自动收起右侧聊天栏。
- **老板键**：默认 `Ctrl+Alt+H`，一键隐藏窗口 + 隐藏任务栏 + 静音 + 暂停播放，再按恢复。
- **BV 跳转**：控制条输入框可直接输入 BV 号 / 视频链接 / av 号跳转播放。
- **系统托盘**：隐藏后可从托盘恢复或退出；窗口位置尺寸自动记忆。

## 快速使用

到 [Releases](https://github.com/iTTsShuu/bilipeek/releases) 下载 `BiliPeek-<版本>-portable.exe`，
**双击即可运行**，绿色便携免安装。

### 控制条按钮

| 按钮 | 功能 |
| --- | --- |
| ‹ / ⌂ / ↻ | 后退 / 首页 / 刷新 |
| BV 输入框 + ▶ | 输入 BV 号或链接跳转播放 |
| S / M / L | 窗口尺寸预设 |
| 📌 | 置顶开关 |
| 🙈 | 老板键（隐藏窗口） |
| — / ✕ | 最小化 / 退出 |

## 从源码构建

需要 Node.js（推荐 18+）。

```bash
git clone https://github.com/iTTsShuu/bilipeek.git
cd bilipeek
npm install
npm start          # 本地运行
npm run dist       # 打包出 dist/BiliPeek-<版本>-portable.exe
```

> **在 WSL 里打包**：网络较慢时建议配置镜像（见下），且已默认跳过需要 wine 的 exe 签名步骤。
>
> ```bash
> export ELECTRON_MIRROR="https://cdn.npmmirror.com/binaries/electron/"
> export ELECTRON_BUILDER_BINARIES_MIRROR="https://cdn.npmmirror.com/binaries/electron-builder-binaries/"
> ```

## 技术栈

- [Electron](https://www.electronjs.org/) 33 —— `<webview>` 内嵌 bilibili
- [electron-builder](https://www.electron.build/) 25 —— Windows portable exe 打包
- 纯原生 JS / HTML / CSS，无额外前端框架

## 项目结构

```
src/
├─ main.js             主进程：窗口 / 老板键 / 托盘 / IPC
├─ preload.js          宿主渲染层 contextBridge (window.api)
├─ index.html          控制条 UI + <webview>
├─ renderer.js         控制条交互 / BV 跳转 / 网页全屏缩放
├─ webview-preload.js  运行在 bilibili 页面内：自动网页全屏
└─ store.js            设置持久化
assets/icon.ico        应用 / 托盘图标
```

更多开发细节见 [CLAUDE.md](./CLAUDE.md)。

## 说明

- 本项目仅是 bilibili 网站的桌面壳，所有内容与账号均来自 bilibili 官方网站。
- 普通视频与直播为 HTML5 播放，无需额外解码组件。
- 若遇到"网页全屏 / 直播聊天栏收起"失效，通常是 bilibili 改版导致播放器选择器变化，欢迎提 Issue。

## License

MIT
