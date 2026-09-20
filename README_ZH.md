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

> [!IMPORTANT]
> WebDAV-Index 运行在浏览器中，因此 WebDAV 服务端必须允许跨域请求：放行 `OPTIONS`、`PROPFIND`、`GET` 方法，以及 `Authorization`、`Depth` 请求头。否则即使 URL 完全正确，连接也无法建立，详见下文的常见问题。

## 实现原理

WebDAV-Index 基于以下依赖构建，它们均以原生 ES 模块的形式从 CDN 加载：

- [webdav-client](https://github.com/perry-mitchell/webdav-client)：列出目录，并生成打开文件所用的 URL
- [localStorage](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage)：将已连接的服务地址与凭证保存在本机
- [Bootstrap](https://getbootstrap.com/)：提供表格、顶栏、弹窗与响应式布局
- [Alpine.js](https://alpinejs.dev/)：以声明式的方式绑定状态与事件

## 常见问题

### 同一个 URL 在别的客户端能用，这里 Connect 却失败，为什么？

WebDAV-Index 运行在浏览器中，列出目录是一次跨域 `PROPFIND` 请求，若服务端未明确放行，浏览器会直接拦截该请求。Finder、rclone、curl 不是浏览器，因此不受 CORS 限制。

被拦截的请求只会以不透明的 `TypeError` 失败，因此 WebDAV-Index 只能给出一条简短的网络错误提示，具体原因需要在浏览器的开发者工具中查看：

1. 在 **Console** 中查找 `blocked by CORS policy` 日志。
2. 在 **Network** 中检查 `OPTIONS` 预检及随后的 `PROPFIND` 请求。常见原因是响应缺少 `Access-Control-Allow-Origin`，或所用的方法、请求头未包含在 `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers` 中。

> [!TIP]
> WebDAV-Index 通过 HTTPS 提供服务，因此以 `http://` 开头的 WebDAV 地址会因混合内容策略被浏览器拦截。

## 许可证

WebDAV-Index 以 MIT License 发布，详见 [LICENSE](LICENSE)。
