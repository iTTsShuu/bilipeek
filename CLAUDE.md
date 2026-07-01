# CLAUDE.md

本文件为 Claude Code（及其他 AI 助手）在本仓库协作开发时的指引。

## 项目简介

BiliPeek 是一个基于 **Electron** 的 Windows 桌面小工具：用一个无边框、置顶、尺寸可调的悬浮小窗访问
bilibili，看视频 / 看直播，带**老板键**一键隐藏并静音暂停。开发在 **WSL(Linux)** 中进行，
用 **electron-builder** 交叉打包出 Windows 绿色便携版 `.exe`。

## 技术栈

- Electron 33（`webviewTag` 内嵌 bilibili 网站）
- electron-builder 25（`--win portable`，输出单文件免安装 exe）
- 无框架、纯原生 JS/HTML/CSS，无额外运行时依赖

## 架构与文件职责

进程模型：主进程(main) + 宿主渲染进程(index.html/renderer) + `<webview>` 内的 bilibili 页面
（通过独立的 webview preload 注入）。

| 文件 | 职责 |
| --- | --- |
| `src/main.js` | 主进程：创建无边框置顶窗口、注册全局老板键、系统托盘、IPC 处理、UA 设置、`will-attach-webview` 给 webview 注入 preload |
| `src/preload.js` | 宿主渲染层的 contextBridge，暴露 `window.api`（窗口控制/置顶/尺寸/老板键/媒体暂停订阅） |
| `src/index.html` | 顶部自定义控制条 + 填充剩余区域的 `<webview>`（`partition="persist:bili"` 持久化登录，`allowpopups` 必须保留） |
| `src/renderer.js` | 宿主渲染逻辑：控制条交互、BV 跳转、网页全屏时按窗口宽对 webview 做缩放、接收 webview 的 ipc-message |
| `src/webview-preload.js` | **运行在 bilibili 页面内**：视频页/直播页自动进入"网页全屏"，并通过 `ipcRenderer.sendToHost` 通知宿主 |
| `src/store.js` | 设置持久化（窗口 bounds、置顶、老板键组合）到 userData 下的 `settings.json` |
| `assets/icon.ico` | 应用/托盘图标（多尺寸 ico） |

### 关键约定

- **窗口尺寸范围**：`MIN_SIZE 320x240` ~ `MAX_SIZE 1280x720`（`src/main.js` 顶部常量）。
- **老板键**：默认 `CommandOrControl+Alt+H`，触发 = 隐藏窗口 + `setSkipTaskbar` + 静音 + 向 webview 发 `boss:pause-media` 暂停播放。
- **宿主 ↔ webview 通信**：webview 内用 `ipcRenderer.sendToHost(channel)`，宿主用 `wv.addEventListener('ipc-message', ...)`。已用频道：`web-fullscreen-entered` / `web-fullscreen-exited`。
- **小窗布局修正**：bilibili 播放器在窄宽度下切紧凑布局导致进度条异常。进入网页全屏时对 webview 施加 `setZoomFactor`（等效视口目标 `TARGET_WIDTH=820`），退出/整页跳转时恢复 1:1。**不要用合成 resize 事件**（播放器用 ResizeObserver，合成事件无效）。
- **不要移除 `<webview>` 的 `allowpopups`**：否则 `setWindowOpenHandler` 不触发，B 站 tag/搜索的新窗口跳转会失效。新窗口在主进程被 deny 并改为在同一 webview 内 `loadURL`。

## 构建 / 运行

```bash
npm install            # 首次；若网络慢见下方镜像
npm start              # 本地运行（WSLg 提供 GUI）
npm run dist           # 打包 Windows portable exe -> dist/BiliPeek-<version>-portable.exe
```

### 在 WSL 里打包的两个坑（重要）

1. **网络**：Electron/electron-builder 二进制易超时，务必用镜像：
   ```bash
   export ELECTRON_MIRROR="https://cdn.npmmirror.com/binaries/electron/"
   export ELECTRON_BUILDER_BINARIES_MIRROR="https://cdn.npmmirror.com/binaries/electron-builder-binaries/"
   ```
   若 electron 二进制未下载：`node node_modules/electron/install.js`（带上上面的 ELECTRON_MIRROR）。
2. **无 wine**：electron-builder 编辑/签名内层 exe 需要 wine，本机通常没有。已在 `package.json`
   设置 `build.win.signAndEditExecutable: false` 跳过该步——代价是 exe 文件本身不带自定义图标
   （运行时窗口/托盘图标仍正常）。如需嵌入图标：装 `wine` 后删掉该配置项再打包。

## bilibili DOM 选择器（易随 B 站改版失效）

`src/webview-preload.js` 依赖这些选择器，改版后可能需要更新：

- 视频播放器容器：`.bpx-player-container`（`data-screen` 属性：`normal`/`web`/`full`/`mini`）
- 视频网页全屏按钮：`.bpx-player-ctrl-web` 或 `[aria-label="网页全屏"]`
- 直播控制条：`.web-player-controller-wrap`；右侧聊天栏：`#aside-area-vm`
- 网页全屏按钮查找有三重兜底：aria-label → 已知类名 → 控制栏内文字 `网页全屏` 匹配

**重新探测选择器的方法**：写一个临时 Electron 脚本（`show:true`），用 `loadURL` 打开对应页面，
`setTimeout` 等渲染后用 `webContents.executeJavaScript` dump 候选元素的 class/aria/title。
直播控件只有在**开播且播放**后才渲染，需模拟播放+hover。用完删除临时脚本。

## 测试说明

- 逻辑改动后先 `node --check <file>` 做语法检查。
- **GUI/播放/老板键/直播全屏等需在真实 Windows 上验证**（此环境无法可靠交互 Windows GUI）；
  打包后可 `cp dist/*.exe /mnt/c/Users/<user>/Desktop/` 到 Windows 双击测试。

## 提交规范

- 提交信息用中文简述「为什么」，遵循现有风格。
- 不要提交 `node_modules/`、`dist/`（已在 `.gitignore`）。
- 远程：`origin` = `https://github.com/iTTsShuu/bilipeek.git`，主分支 `main`。
