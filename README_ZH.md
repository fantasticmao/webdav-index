# WebDAV Index

README [English](README.md) | [中文](README_ZH.md)

## 这是什么

一个本地优先的 WebDAV 客户端，以只读列表的形式浏览远程文件。

所有逻辑都运行在浏览器中，因此无论何时、使用什么设备，你的个人数据都触手可及。

### 关键特性

- [x] **列表视图**：以表格展示文件名、最后修改时间和大小
- [x] **身份认证**：可选的 HTTP Basic 认证，按需填写账号密码
- [x] **凭证持久化**：账号和密码可以保存到本地 `localStorage`
- [x] **连接切换**：在已保存的连接间切换，无需重复输入凭证
- [x] **移动设备友好**：响应式布局，在手机和平板上浏览同样方便

## 下载安装

无需下载和安装，在浏览器中打开 [https://fantasticmao.github.io/webdav-index/](https://fantasticmao.github.io/webdav-index/) 即可。

## 快速开始

填写 WebDAV 服务的 URL，如果该服务需要认证，则再填写账号和密码，然后点击 Connect。

![quick-start.png](quick-start.png)

> **注意**：你的 WebDAV 服务必须启用跨域资源共享（CORS），至少需要放行 `OPTIONS`、`PROPFIND`、`GET` 请求方法，以及 `Authorization`、`Depth` 请求头。

WebDAV-Index 直接在浏览器中列出远程目录、打开文件，既没有后端，也没有构建步骤。浏览是只读的：编辑、上传和删除文件都不在本项目的范围内。`.mp4`、`.jpg`、`.txt` 等文件能否预览，取决于浏览器的能力以及服务端返回的内容类型。

## 实现原理

WebDAV-Index 基于以下主要依赖构建：

- [webdav-client](https://github.com/perry-mitchell/webdav-client)：直接从浏览器发送 WebDAV 请求，用于列目录和获取元数据。
- [localStorage](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage)：将连接信息和凭证保存在本机，便于快速访问和切换主机。
- [Bootstrap](https://getbootstrap.com/)：提供 UI 组件、栅格系统和响应式样式，用于界面布局。
- [Alpine.js](https://alpinejs.dev/)：以声明式的方式管理界面状态和用户交互，从而驱动页面。

## 常见问题和回答

## 许可声明

WebDAV-Index [License](https://github.com/fantasticmao/webdav-index/blob/main/LICENSE)

Copyright (c) 2026 fantasticmao
