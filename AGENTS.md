# AGENTS

## Project overview

A **local-first, static, zero-build** WebDAV client: the browser lists a remote directory as a read-only table and opens files in a new tab.

- **No backend, no build, no `package.json`.** Dependencies load from jsDelivr as native ES modules.
- **Read-only.** No uploads, edits, deletes or other writes.
- **Optional HTTP Basic auth.** Credentials stay in the user's `localStorage` (Alpine Persist) so known hosts can be switched without re-entering them.
- **CORS is required** on the WebDAV server: `OPTIONS`, `PROPFIND`, `GET`, plus the `Authorization` and `Depth` headers.

## Project layout

```text
docs/                 # Site root; all code lives here
├── index.html        # The only page: Alpine templates, CDN deps, first-paint theme script
├── favicon.svg
├── css/app.css       # Styles Bootstrap utilities cannot express
└── js/
    ├── app.js        # Alpine `app`: UI state and interaction wiring
    ├── config.js     # `url` / `path` query params and path normalization
    ├── webdav.js     # Directory listing, opening files, error classification
    ├── theme.js      # Light/dark theme
    └── ui.js         # Breadcrumbs, timestamp and size formatting
```

`config.js`, `webdav.js`, `theme.js` and `ui.js` are stateless. Only `app.js` holds state and touches the DOM / Alpine — put new logic in the module it belongs to.

## Running locally

No test or lint tooling; the developer checks changes in a browser. Serve with a static server (`file://` breaks ES modules):

```bash
python3 -m http.server 8000 --directory docs
# then open http://localhost:8000/?url=<encoded_webdav_url>&path=<encoded_path>
```

## Conventions

- Follow `.editorconfig`: UTF-8, LF, 100 columns, trailing newline; 2-space JS/CSS, 4-space HTML.
- **English only** for code, comments, UI copy and commits. `README_ZH.md` is the only Chinese file.
- Comments explain _why_ (browser quirks, server compatibility, CORS), not what the code already says.
- Prefer Bootstrap 5 utilities; add to `app.css` only when needed. Icons are the inline SVG `<symbol>` / `<use>` block in `index.html`.
- User-facing changes need a matching update to both `README.md` and `README_ZH.md`.

## Security

Credentials are plaintext in `localStorage` and in the URL userinfo when a file is opened. Never send credentials, WebDAV URLs or directory contents anywhere other than the configured server, and don't add analytics, logging or other third-party runtime endpoints.
