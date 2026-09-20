# WebDAV Index

[![License](https://img.shields.io/github/license/fantasticmao/webdav-index)](LICENSE)
[![Live demo](https://img.shields.io/badge/live_demo-online-blue)](https://webdav-index.fantasticmao.cn/)

README [English](README.md) | [中文](README_ZH.md)

## What is this

WebDAV-Index is a local-first WebDAV client that browses remote files as a read-only list. It is static and requires no build step: a single HTML file and a few ES modules, with all dependencies loaded from a CDN. It runs entirely in the browser, communicates with the WebDAV server directly, and sends data to no third party.

![usage.png](usage.png)

WebDAV-Index provides browsing only: it lists directories, navigates into subdirectories and opens files, and it does not upload, edit, rename or delete. It opens each file through the browser, which renders `.jpg`, `.txt` and `.mp4` in place and downloads the rest.

## Features

- **Read-only listing**: renders each directory as a table of name, modified time and size
- **Optional auth**: sends HTTP Basic credentials only when the server requires them
- **Saved credentials**: stores credentials in `localStorage` and reuses them after a reload
- **Multiple hosts**: records connected servers and switches between them from the navbar
- **Responsive layout**: adapts to phone, tablet and desktop screen widths

## Download and Install

WebDAV-Index requires no download or installation: open [webdav-index.fantasticmao.cn](https://webdav-index.fantasticmao.cn/) in a browser and it is ready to use.

## Quick Start

WebDAV-Index opens a connection form on first visit. Enter the URL of the WebDAV service, add a username and password if the server requires authentication, then click Connect.

![connect.png](connect.png)

> [!IMPORTANT]
> WebDAV-Index runs in the browser, so the WebDAV server must allow cross-origin requests: the `OPTIONS`, `PROPFIND` and `GET` methods, plus the `Authorization` and `Depth` request headers. Without them the connection cannot be established, however correct the URL is; see the FAQ below.

## How it works

WebDAV-Index is built on the following dependencies, all loaded from a CDN as native ES modules:

- [webdav-client](https://github.com/perry-mitchell/webdav-client): lists directories and builds the URLs used to open a file
- [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage): keeps connected servers and their credentials on the local machine
- [Bootstrap](https://getbootstrap.com/): provides the table, navbar, dialog and responsive layout
- [Alpine.js](https://alpinejs.dev/): binds state and events declaratively, without a build step

## FAQ

### Connect fails, but the same URL works in another client. Why?

WebDAV-Index runs in the browser, so listing a directory is a cross-origin `PROPFIND` request, which the browser blocks unless the server explicitly allows it. Finder, rclone and curl are not browsers and are therefore not subject to CORS.

A blocked request fails as an opaque `TypeError`, so WebDAV-Index can only report a short network error; the specific cause has to be read from the browser's developer tools:

1. In **Console**, look for a `blocked by CORS policy` message.
2. In **Network**, inspect the `OPTIONS` preflight and the `PROPFIND` that follows. Common causes are a response without `Access-Control-Allow-Origin`, or a method or header missing from `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers`.

> [!TIP]
> WebDAV-Index is served over HTTPS, so a WebDAV URL beginning with `http://` is blocked by the browser's mixed content policy.

## License

WebDAV-Index is released under the MIT License; see [LICENSE](LICENSE).
