# AGENTS

## Project overview

WebDAV-Index is a **fully static, zero-build** front-end app. It lists remote directories with WebDAV `PROPFIND` requests straight from the browser and renders them as a read-only table of files.

Key constraints:

- **No backend.** Every request goes directly from the browser to the WebDAV server the user configured.
- **No build step, no `package.json`, no `node_modules`.** Third-party dependencies are loaded from the jsDelivr CDN as native browser ES modules.
- **Read-only browsing.** Listing directories and opening files in a new tab are the only features; uploads, deletes, renames and other write operations are out of scope.

## Project layout

```text
docs/                 # Site root; all code lives here
├── index.html        # The only page: Alpine templates, CDN dependencies, inline first-paint theme script
├── favicon.svg       # Tab icon: a directory listing with a chevron
├── css/app.css       # Only the styles that Bootstrap utility classes cannot express
└── js/
    ├── app.js        # Alpine component `app`: all UI state and interaction wiring; entry module
    ├── config.js     # Reads and writes the `url` / `path` query params; path normalization
    ├── webdav.js     # WebDAV client wrapper: directory listing, opening files, error classification
    ├── theme.js      # Reads, applies and persists the light/dark theme
    └── ui.js         # Pure presentation logic: breadcrumbs, timestamp and size formatting
```

Keep the module boundaries clean: `config.js`, `webdav.js`, `theme.js` and `ui.js` are stateless modules of pure functions, and `app.js` is the only one that holds state and touches the DOM / Alpine. Put new logic in whichever module it belongs to instead of folding network or path handling back into `app.js`.

## Running locally

There is no test or lint tooling in this project, and **you don't need to test or verify your changes** — the developer confirms the result in a browser.

If you do want to serve the site, use a static server; opening `index.html` directly over `file://` fails because of the CORS restrictions on ES modules:

```bash
python3 -m http.server 8000 --directory docs
# then open http://localhost:8000/?url=<encoded_webdav_url>&path=<encoded_path>
```

## Coding conventions

- Follow `.editorconfig`: UTF-8, LF, 100-column lines, trailing newline, 2-space indentation for JS and CSS, and 4 spaces for HTML.
- **Code, comments, UI copy and commit messages are all in English.** `README_ZH.md` is the only Chinese file.
- Comments explain _why_, not what: browser quirks, server compatibility, CORS constraints and other non-obvious trade-offs. Don't restate what the code already says; the existing comments set the standard.
- Reach for Bootstrap 5's own components and utility classes first, and only add to `app.css` when a style genuinely cannot be expressed with them.
- Icons come from the inline SVG `<symbol>` / `<use>` block at the top of `index.html`. Don't pull in an icon font or icon library.

## Documentation

User-facing changes — new features, parameter changes, CORS requirements, FAQ entries — need a matching update to `README_ZH.md`.

## Security notes

Credentials live in plaintext in the user's own `localStorage`, and they are also written into the URL userinfo when a file is opened. Never send credentials, WebDAV URLs or directory contents anywhere other than the WebDAV server the user configured, and don't introduce new third-party runtime endpoints such as analytics, logging or error reporting.
