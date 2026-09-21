# WebDAV Index

[![License](https://img.shields.io/github/license/fantasticmao/webdav-index)](LICENSE)
[![Live demo](https://img.shields.io/badge/live_demo-online-blue)](https://webdav-index.fantasticmao.cn/)

README [English](README.md) | [中文](README_ZH.md)

## 这是什么

WebDAV-Index 是一个本地优先的 WebDAV 客户端，以只读列表的形式浏览远程文件。它是静态的，且无需构建步骤：仅由一份 HTML 和几个 ES 模块组成，依赖全部从 CDN 加载。它完全运行在浏览器中，直接与 WebDAV 服务通信，不会将数据发送给任何第三方。

![usage.png](usage.png)

WebDAV-Index 只提供浏览功能：列出目录、进入子目录、打开文件，不提供上传、编辑、重命名和删除。它通过浏览器打开文件，`.jpg`、`.txt`、`.mp4` 这类可以直接查看，其余的则转为下载。

## 关键特性

- **只读列表**：将每个目录呈现为文件名、修改时间和大小的表格
- **可选认证**：仅在服务端要求时发送 HTTP Basic 凭证
- **凭证保存**：将凭证存入 `localStorage`，刷新后自动复用
- **多主机管理**：记录已连接的服务，可在顶栏菜单中快速切换
- **响应式布局**：自适应手机、平板与桌面的屏幕宽度

## 下载安装

WebDAV-Index 无需下载和安装，在浏览器中打开 [webdav-index.fantasticmao.cn](https://webdav-index.fantasticmao.cn/) 即可使用。

## 快速开始

WebDAV-Index 在首次访问时会弹出连接表单。填写 WebDAV 服务的 URL，如果服务端要求认证，再填写账号和密码，然后点击 Connect。

![connect.png](connect.png)

## 实现原理

WebDAV-Index 基于以下依赖构建，它们均以原生 ES 模块的形式从 CDN 加载：

- [webdav-client](https://github.com/perry-mitchell/webdav-client)：列出目录，并生成打开文件所用的 URL
- [localStorage](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage)：将已连接的服务地址与凭证保存在本机
- [Bootstrap](https://getbootstrap.com/)：提供表格、顶栏、弹窗与响应式布局
- [Alpine.js](https://alpinejs.dev/)：以声明式的方式绑定状态与事件

## 常见问题

当 WebDAV-Index 提示浏览器拦截了请求时，原因是下列之一。

### 为什么同一个 URL 在别的客户端能用，这里 Connect 却失败？

WebDAV-Index 使用跨源 `PROPFIND` 列出目录，服务端未允许时 CORS 会拦截该请求。需要放行 `OPTIONS` 与 `PROPFIND`，使 `Access-Control-Allow-Origin` 匹配当前源，并在 `Access-Control-Allow-Headers` 中包含 `Depth`（有凭证时再加 `Authorization`）。

### 为什么从 `https://` 源访问 `http://` 的 WebDAV 地址会被拒绝？

Mixed Content 策略会拦截来自 HTTPS 源的 HTTP 请求；Chrome 与 Firefox 对 loopback（`127.0.0.1`、`localhost`、`[::1]`）予以豁免，Safari 仍可能拦截 loopback。三选一：用 `http://` 打开本站，在站点设置中允许不安全内容，或让 WebDAV 以 HTTPS 提供。

### 为什么家用 NAS、局域网或 loopback 地址从线上站点连不上？

当公网源访问私网或 loopback 地址时适用 Local Network Access，Chrome 可能弹出权限提示。若浏览器询问则允许本地网络访问；服务端仍须满足 CORS。

## 许可证

WebDAV-Index 以 MIT License 发布，详见 [LICENSE](LICENSE)。
