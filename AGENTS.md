# AGENTS

## 项目概览

WebDAV-Index 是一个 **纯静态、零构建** 的前端应用，支持在浏览器里通过 WebDAV `PROPFIND` 请求列出远程目录，以表格形式只读浏览文件。

关键约束：

- **没有后端**，所有请求都由浏览器直接发往用户配置的 WebDAV 服务器。
- **没有构建步骤、没有 `package.json`、没有 `node_modules`**，第三方依赖以浏览器原生 ES 模块的形式从 jsDelivr CDN 加载。
- **只做只读浏览**，只支持列出目录、在新标签页打开文件，不实现上传、删除、重命名等写操作。

## 目录结构

```text
docs/                 # 站点根目录，所有代码都在这里
├── index.html        # 唯一页面：Alpine 模板、CDN 依赖声明、首屏主题内联脚本
├── css/app.css       # 仅存放无法用 Bootstrap 工具类表达的样式
└── js/
    ├── app.js        # Alpine 组件 `app`：全部 UI 状态与交互编排，入口模块
    ├── config.js     # URL query 参数（`url` / `path`）读写与路径规范化
    ├── webdav.js     # WebDAV 客户端封装：列目录、打开文件、错误归类
    ├── theme.js      # 明暗主题的读取、应用与持久化
    └── ui.js         # 纯展示逻辑：面包屑、时间与体积格式化
```

模块职责边界要保持清晰：`config.js` / `webdav.js` / `theme.js` / `ui.js` 都是无状态的纯函数模块，只有 `app.js` 持有状态并操作 DOM/Alpine。新增逻辑时优先放进对应的模块，不要把网络或路径逻辑写回 `app.js`。

## 本地运行

项目没有测试与 lint 工具链，**不需要自行测试或验证改动**，运行与效果确认由开发者在浏览器里完成。

如需本地起服务，必须用静态服务器打开，直接双击 `index.html`（`file://`）会因 ES 模块的 CORS 限制而失败：

```bash
python3 -m http.server 8000 --directory docs
# 然后访问 http://localhost:8000/?url=<encoded_webdav_url>&path=<encoded_path>
```

## 编码约定

- 遵循 `.editorconfig`，满足 UTF-8、LF、行宽 100、结尾换行，JS/CSS 用 2 空格缩进，HTML 实际用 4 空格。
- 所有 **代码、注释、UI 文案、commit message 一律使用英文**，只有 `README_ZH.md` 用中文。
- 注释只解释「为什么」，即浏览器怪癖、服务端兼容性、CORS 限制等非显而易见的取舍，不要复述代码在做什么，现有注释的风格就是标准。
- 样式优先使用 Bootstrap 5 原生组件与工具类，只有确实无法表达时才写进 `app.css`。
- 图标使用 `index.html` 顶部内联的 SVG `<symbol>` + `<use>`，不要引入图标字体或图标库。

## 文档维护

面向用户的改动（新特性、参数变更、CORS 要求、常见问题）需要同步更新 `README_ZH.md`。

## 安全注意事项

凭证是明文存在用户本机 `localStorage` 里的，打开文件时还会写入 URL userinfo。不要把凭证、WebDAV URL 或目录内容发送到除用户配置的 WebDAV 服务器之外的任何地方，也不要引入新的第三方运行时端点（分析、日志、错误上报等）。
