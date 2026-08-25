# WebDAV Index

README [English](README.md) | [中文](README_ZH.md)

## What is this

A local-first WebDAV client that browses remote files as a read-only list.

Everything runs in the browser, so your personal data stays within reach from any device, at any time.

### Features

- [x] **List View**: files shown in a table with name, last modified time, and size
- [x] **Authentication**: optional HTTP Basic authentication when the server requires it
- [x] **Persistent Credentials**: username and password can be saved locally to `localStorage`
- [x] **Connection Switching**: switch between saved connections without re-entering credentials
- [x] **Mobile Friendly**: responsive layout that works on phones, tablets and desktops

## Download and Install

Nothing to download or install — just open [https://fantasticmao.github.io/webdav-index/](https://fantasticmao.github.io/webdav-index/) in your browser.

## Quick Start

Enter the URL of your WebDAV service, along with a username and password if the service requires them, then click Connect.

![quick-start.png](quick-start.png)

> **Note**: Your WebDAV service must have Cross-Origin Resource Sharing (CORS) enabled. At a minimum, it has to allow the `OPTIONS`, `PROPFIND`, and `GET` methods, and the `Authorization` and `Depth` request headers.

WebDAV-Index lists remote directories and opens files straight from the browser, with no backend and no build step. Browsing is read-only: editing, uploading, and deleting files are out of scope. Whether a file such as `.mp4`, `.jpg`, or `.txt` can be previewed depends on the capabilities of the browser and on the content type the server returns.

## How it works

WebDAV-Index is built on the following major dependencies:

- [webdav-client](https://github.com/perry-mitchell/webdav-client): sends WebDAV requests for listings and metadata directly from the browser.
- [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage): keeps connection details and credentials locally for access and host switching.
- [Bootstrap](https://getbootstrap.com/): supplies the UI components, grid system, and responsive styles for the layout.
- [Alpine.js](https://alpinejs.dev/): manages UI state and user interactions in a declarative way from the browser.

## Frequently Asked Questions

Q: Why does Connect fail even though the same URL works in another client?

A: WebDAV-Index runs in the browser, so listing a directory is a cross-origin `PROPFIND` request. Clients such as Finder, rclone, or curl are not browsers and do not need CORS.

When the request is blocked, the app shows a short network error. The page cannot show the real CORS reason: `fetch` only rejects with an opaque `TypeError`. The detailed _blocked by CORS policy_ message appears only in the browser's developer tools.

To diagnose:

1. Open DevTools (F12) -> Console and look for `blocked by CORS policy`.
2. In the Network tab, inspect the `OPTIONS` preflight, then `PROPFIND`. Typical failures are a missing `Access-Control-Allow-Origin` header, a method not listed in `Access-Control-Allow-Methods`, or `Authorization` / `Depth` missing from `Access-Control-Allow-Headers`.

The server must allow the `OPTIONS`, `PROPFIND`, and `GET` methods, and the `Authorization` and `Depth` request headers.

Also check mixed content: the GitHub Pages app is served over HTTPS, so an `http://` WebDAV URL is blocked the same way.

## License

WebDAV-Index [License](https://github.com/fantasticmao/webdav-index/blob/main/LICENSE)

Copyright (c) 2026 fantasticmao
