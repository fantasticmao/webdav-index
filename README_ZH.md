# WebDAV Index

## 这是什么

WebDAV-Index 是一个基于 WebDAV 协议，把远程文件与目录以表格平铺展示的纯前端 Web 应用程序，可自建部署到 GitHub Pages，支持桌面与移动端便捷浏览。

WebDAV-Index 当前支持以下特性：

- **纯静态页面**：本项目没有后端，无需构建步骤，所有请求均在浏览器本地完成
- **文件只读浏览**：列目录、面包屑导航、进入子目录；点击文件在新标签页打开预览
- **URL 参数驱动**：`url` 指定 WebDAV 根地址，`path` 指定文件目录地址，便于分享与刷新
- **HTTP 基本认证**：支持 HTTP Basic 认证，账号密码保存在本机浏览器的 `localStorage`；也支持无需认证的服务，账号密码留空即为匿名访问
- **多 Host 切换**：可登录多个 WebDAV，凭证持久保存在本机，通过右上角下拉菜单切换
- **移动设备友好**：支持响应式布局，列表内容在窄屏下可横滑，触控区域友好
- **明暗主题**：默认跟随操作系统的深色偏好，也可在右上角手动切换，选择保存在本机浏览器

## 快速开始

### WebDAV 客户端内容浏览

浏览器打开：

```text
https://fantasticmao.github.io/webdav-index/?url=https://webdav.example.com/files/
```

| 参数   | 说明                                    |
| ------ | --------------------------------------- |
| `url`  | WebDAV 远程服务 URL，需要支持 CORS 访问 |
| `path` | WebDAV 内容相对根目录的路径，缺省为 `/` |

### WebDAV 服务端 CORS 配置

跨域访问时，服务端必须允许浏览器的 `OPTIONS` / `PROPFIND` / `GET`。列目录实际只需要放行 `Authorization` 与 `Depth` 两个非安全列表请求头；无需认证的服务只放行 `Depth` 即可，因为匿名访问不会发送 `Authorization`。下面的配置是一个便于扩展的超集：

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS, PROPFIND
Access-Control-Allow-Headers: Authorization, Content-Type, Depth
```

Nginx 示例：

```nginx
location /files/ {
    # ... 原有 WebDAV / 鉴权配置

    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS, PROPFIND";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Depth";
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }

    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS, PROPFIND" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, Depth" always;
}
```

## 实现原理

1. **列目录**：由 [webdav](https://github.com/perry-mitchell/webdav-client) 客户端对目标目录发送 WebDAV `PROPFIND`（`Depth: 1`，无请求体即 `allprop`），解析 `207 Multi-Status` XML，取出 `href`、`getlastmodified`、`getcontentlength`、`resourcetype/collection`。该库以浏览器 ES 模块形式从 CDN 直接加载，不引入构建步骤。
2. **鉴权**：每个请求带 `Authorization: Basic ...`，请求头在本地生成（非 ASCII 账号密码按 UTF-8 编码），凭证以 WebDAV 根 URL 为索引存入 `localStorage` 的 `webdav-index:creds`，关闭标签页后仍可复用，Sign out 或清除站点数据后失效。同一浏览器可记住多个根 URL，并在右上角切换。账号与密码同时留空时视为匿名访问，请求完全不带 `Authorization`（而不是发送一个空的 Basic 凭证），避免服务端 CORS 未放行该请求头时预检失败；只填其中之一仍按 Basic 处理。
3. **界面**：[Bootstrap](https://getbootstrap.com/) 负责样式与弹窗/下拉组件，[Alpine.js](https://alpinejs.dev/) 负责声明式渲染与状态，目录列表、面包屑、连接表单都直接由 `index.html` 中的模板驱动。样式尽量只使用 Bootstrap 原生组件与工具类，自定义 CSS 仅保留图标尺寸、表格列宽等无法用工具类表达的部分。
4. **明暗主题**：使用 Bootstrap 原生的 `data-bs-theme` 色彩模式。首屏渲染前由 `index.html` 中的内联脚本读取 `localStorage` 的 `webdav-index:theme`（缺省回退到 `prefers-color-scheme`）并写入 `<html>`，因此刷新时不会闪白；手动切换后主题会持久保存。
5. **路由**：使用 query 参数 `path` 表示当前目录，配合 `pushState` / `popstate` 支持前进后退。
6. **打开文件**：在新标签页打开资源 URL，并将用户名密码写入 URL userinfo（`https://user:pass@host/path`），以便浏览器直接渲染图片、PDF 等，无需再弹一次登录框；匿名访问时不写 userinfo，直接打开原始 URL。
7. **CORS**：静态站与 WebDAV 通常不同源，浏览器会先发 `OPTIONS` 预检；服务端未正确回 CORS 头时，前端只能提示网络/跨域错误。
8. **第三方依赖**：Bootstrap、Alpine.js、webdav、pretty-bytes 全部按精确版本从 jsDelivr 加载并带 `integrity` 校验，仓库里不含 `node_modules`，也不需要打包。

## 常见问题

Q: 为什么列表加载失败，提示无法连接或 CORS？

A: 浏览器从 Pages / 本地源访问另一域名的 WebDAV 时必须配置 CORS。确认 `OPTIONS` 与 `PROPFIND` 都返回 `Access-Control-Allow-Origin`、`Allow-Methods`（含 `PROPFIND`）、`Allow-Headers`（含 `Authorization`、`Depth`）。

---

Q: 为什么认证失败？

A: 检查用户名密码是否正确，以及 WebDAV 是否启用 HTTP Basic（部分服务默认 Digest / Bearer，本项目不支持）。401/403 时会清空本地凭证并重新弹出连接框。

---

Q: WebDAV 服务不需要账号密码，怎么用？

A: 在连接框里填好 URL，用户名与密码都留空提交即可，此时请求不会携带 `Authorization`。如果服务端其实要求认证，会返回 401/403 并提示需要输入账号密码，重新填写即可。

---

Q: 点击文件后仍要输入密码，或无法预览？

A: 新标签页通过 URL userinfo 携带凭证；部分浏览器会限制或剥离 userinfo。若被拦截，会退化为浏览器原生鉴权弹窗。能否内联预览取决于服务端返回的 `Content-Type` 与浏览器能力。

---

Q: `path` 与 WebDAV 上的真实路径是什么关系？

A: `path` 是相对于 `url` 所指向根目录的路径。例如 `url=https://webdav.example.com/files/` 且 `path=/a/b/`，实际请求的是 `https://webdav.example.com/files/a/b/`。

---

Q: 账号密码会泄漏吗？

A: 不会主动外泄。密码只存在你本机浏览器的 `localStorage`，并随请求发往你配置的 WebDAV 服务器。同一设备上的其他网页脚本无法跨域读取；清除站点数据或 Sign out 后会删除。

---

Q: 支持上传、删除、新建文件夹吗？

A: 当前版本只做只读浏览与打开文件，不包含写操作。

## 许可声明

WebDAV-Index [License](https://github.com/fantasticmao/webdav-index/blob/main/LICENSE)

Copyright (c) 2026 fantasticmao
