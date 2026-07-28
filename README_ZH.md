# WebDAV Index

## 这是什么

WebDAV-Index 是一个基于 WebDAV 协议，把远程文件与目录以表格平铺展示的纯前端 Web 应用程序，可自建部署到 GitHub Pages，支持桌面与移动端便捷浏览。

WebDAV-Index 当前支持以下特性：

- **纯静态页面**：本项目没有后端，所有请求均在浏览器本地完成
- **文件只读浏览**：列目录、面包屑导航、进入子目录；点击文件在新标签页打开预览
- **URL 参数驱动**：`url` 指定 WebDAV 根地址，`path` 指定文件目录地址，便于分享与刷新
- **HTTP 基本认证**：支持 HTTP Basic 认证，账号密码保存在本机浏览器的 `localStorage`
- **多 Host 切换**：可登录多个 WebDAV，凭证持久保存在本机，通过右上角下拉菜单切换
- **移动设备友好**：支持响应式布局，列表内容在窄屏下可横滑，触控区域友好

## 快速开始

### WebDAV 客户端内容浏览

浏览器打开：

```text
https://fantasticmao.github.io/webdav-index/?url=https://dav.example.com/files/
```

| 参数   | 说明                                    |
| ------ | --------------------------------------- |
| `url`  | WebDAV 远程服务 URL，需要支持 CORS 访问 |
| `path` | WebDAV 内容相对根目录的路径，缺省为 `/` |

### WebDAV 服务端 CORS 配置

跨域访问时，服务端必须允许浏览器的 `OPTIONS` / `PROPFIND` / `GET`。至少包含：

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

1. **列目录**：对目标目录发送 WebDAV `PROPFIND`（`Depth: 1`），解析 `207 Multi-Status` XML，取出 `href`、`displayname`、`getlastmodified`、`getcontentlength`、`resourcetype/collection`。
2. **鉴权**：每个请求带 `Authorization: Basic ...`；凭证按 WebDAV 根 URL 存入 `localStorage`，关闭标签页后仍可复用，Sign out 或清除站点数据后失效。同一浏览器可记住多个根 URL，并在右上角切换。
3. **路由**：使用 query 参数 `path` 表示当前目录，配合 `pushState` / `popstate` 支持前进后退。
4. **打开文件**：在新标签页打开资源 URL，并将用户名密码写入 URL userinfo（`https://user:pass@host/path`），以便浏览器直接渲染图片、PDF 等，无需再弹一次登录框。
5. **CORS**：静态站与 WebDAV 通常不同源，浏览器会先发 `OPTIONS` 预检；服务端未正确回 CORS 头时，前端只能提示网络/跨域错误。

## 常见问题

Q: 为什么列表加载失败，提示无法连接或 CORS？

A: 浏览器从 Pages / 本地源访问另一域名的 WebDAV 时必须配置 CORS。确认 `OPTIONS` 与 `PROPFIND` 都返回 `Access-Control-Allow-Origin`、`Allow-Methods`（含 `PROPFIND`）、`Allow-Headers`（含 `Authorization`、`Depth`）。

---

Q: 为什么认证失败？

A: 检查用户名密码是否正确，以及 WebDAV 是否启用 HTTP Basic（部分服务默认 Digest / Bearer，本项目不支持）。401/403 时会清空本地凭证并重新弹出连接框。

---

Q: 点击文件后仍要输入密码，或无法预览？

A: 新标签页通过 URL userinfo 携带凭证；部分浏览器会限制或剥离 userinfo。若被拦截，会退化为浏览器原生鉴权弹窗。能否内联预览取决于服务端返回的 `Content-Type` 与浏览器能力。

---

Q: `path` 与 WebDAV 上的真实路径是什么关系？

A: `path` 是相对于 `url` 所指向根目录的路径。例如 `url=https://dav.example.com/files/` 且 `path=/a/b/`，实际请求的是 `https://dav.example.com/files/a/b/`。

---

Q: 账号密码会泄漏吗？

A: 不会主动外泄。密码只存在你本机浏览器的 `localStorage`，并随请求发往你配置的 WebDAV 服务器。同一设备上的其他网页脚本无法跨域读取；清除站点数据或 Sign out 后会删除。

---

Q: 支持上传、删除、新建文件夹吗？

A: 当前版本只做只读浏览与打开文件，不包含写操作。

## 许可声明

WebDAV-Index [License](https://github.com/fantasticmao/webdav-index/blob/main/LICENSE)

Copyright (c) 2026 fantasticmao
