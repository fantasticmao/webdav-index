/**
 * WebDAV client: directory listing + open file in new tab with Basic auth.
 *
 * Backed by the `webdav` package browser build, loaded straight from the CDN as a
 * self-contained ES module so the app stays build-free.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/webdav@5.10.0/dist/web/index.js";

/**
 * @typedef {object} WebDavEntry
 * @property {string} name
 * @property {string} hrefPath  Absolute path on the server (pathname + search), decoded
 * @property {string} relativePath Path relative to base (starts with /)
 * @property {boolean} isCollection
 * @property {string|null} lastModified ISO or raw string
 * @property {number|null} size
 */

/**
 * Subset of the `FileStat` shape returned by the client with `details: true`.
 * @typedef {object} FileStat
 * @property {string} filename Decoded path relative to the client base URL, no trailing slash
 * @property {string} basename
 * @property {string|null} lastmod
 * @property {number} size Falls back to 0 when the server omits `getcontentlength`
 * @property {'file'|'directory'} type
 * @property {Record<string, unknown>} [props] Raw properties, namespace prefixes stripped
 */

/**
 * The client's own Basic auth support base64-encodes as Latin1 and throws on non-ASCII
 * credentials, so the header is built here and passed through as a custom header instead.
 * Keeping the client on `AuthType.None` also makes `getFileDownloadLink` return a clean
 * URL, which lets `URL` percent-encode the userinfo properly.
 * @param {string} username
 * @param {string} password
 * @returns {string}
 */
export function basicAuthHeader(username, password) {
  const token = `${username}:${password}`;
  try {
    return "Basic " + btoa(token);
  } catch {
    const bytes = new TextEncoder().encode(token);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return "Basic " + btoa(binary);
  }
}

/** @type {{ key: string, client: any }|null} */
let cachedClient = null;

/**
 * @param {string} baseUrl
 * @param {{ username: string, password: string }} credentials
 */
function getClient(baseUrl, credentials) {
  const key = `${baseUrl}\u0000${credentials.username}\u0000${credentials.password}`;
  if (!cachedClient || cachedClient.key !== key) {
    cachedClient = {
      key,
      client: createClient(baseUrl, {
        headers: { Authorization: basicAuthHeader(credentials.username, credentials.password) },
      }),
    };
  }
  return cachedClient.client;
}

/**
 * @param {string} baseUrl
 * @param {string} relativePath
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<WebDavEntry[]>}
 */
export async function listDirectory(baseUrl, relativePath, credentials) {
  const client = getClient(baseUrl, credentials);
  const currentPath = relativePath || "/";

  let result;
  try {
    // `details` exposes the raw props, the only way to tell a 0-byte file from a
    // server that omits `getcontentlength` (both surface as `size: 0`).
    result = await client.getDirectoryContents(currentPath, { details: true });
  } catch (err) {
    throw toAppError(err);
  }

  /** @type {FileStat[]} */
  const items = result.data;
  return items
    .filter((item) => isImmediateChild(currentPath, item.filename))
    .map(toEntry)
    .sort(compareEntries);
}

/**
 * `Depth: 1` is the server's job; some implementations over-report, so keep filtering
 * to direct children ourselves.
 * @param {string} currentPath
 * @param {string} filename
 */
function isImmediateChild(currentPath, filename) {
  const parent = currentPath.endsWith("/") ? currentPath : currentPath + "/";
  if (!filename.startsWith(parent)) return false;
  const rest = filename.slice(parent.length);
  return rest !== "" && !rest.includes("/");
}

/**
 * `filename` is decoded, starts with `/` and has no trailing slash; directories are
 * normalized back to a trailing slash to match the app's path format.
 * @param {FileStat} item
 * @returns {WebDavEntry}
 */
function toEntry(item) {
  const isCollection = item.type === "directory";
  const length = item.props?.getcontentlength;
  const hasLength = length !== undefined && length !== "";
  return {
    name: item.basename,
    hrefPath: item.filename,
    relativePath: isCollection ? item.filename + "/" : item.filename,
    isCollection,
    lastModified: item.lastmod || null,
    size: hasLength && Number.isFinite(item.size) ? item.size : null,
  };
}

/**
 * Directories first, then by name.
 * @param {WebDavEntry} a
 * @param {WebDavEntry} b
 */
function compareEntries(a, b) {
  if (a.isCollection !== b.isCollection) return a.isCollection ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/**
 * Translate client errors into the `code`-tagged errors the app branches on.
 * The client throws `Error` with `status` / `response` for HTTP failures, and lets
 * `fetch` rejections (network / CORS) through as `TypeError`.
 * @param {any} err
 * @returns {Error}
 */
function toAppError(err) {
  const status = err?.status;

  if (status === 401 || status === 403) {
    const error = new Error("Authentication failed. Please check your username and password.");
    error.code = "AUTH";
    error.status = status;
    error.cause = err;
    return error;
  }

  if (typeof status === "number") {
    const error = new Error(`PROPFIND failed: HTTP ${status}`);
    error.code = "HTTP";
    error.status = status;
    error.cause = err;
    return error;
  }

  if (err?.name === "TypeError") {
    const error = new Error(
      "Unable to reach the WebDAV server. If this is a cross-origin request, ensure the server allows CORS (PROPFIND / Authorization / Depth).",
    );
    error.code = "NETWORK";
    error.cause = err;
    return error;
  }

  const error = new Error(err?.message || "Failed to read the WebDAV response.");
  error.code = "PARSE";
  error.cause = err;
  return error;
}

/**
 * Open a file in a new browser tab, carrying Basic credentials in URL userinfo so the
 * browser can render images / PDFs without prompting again.
 * @param {string} baseUrl
 * @param {string} relativePath
 * @param {{ username: string, password: string }} credentials
 */
export function openFile(baseUrl, relativePath, credentials) {
  const client = getClient(baseUrl, credentials);
  const url = new URL(client.getFileDownloadLink(relativePath));
  // The URL setters percent-encode, unlike the client's own userinfo injection.
  url.username = credentials.username;
  url.password = credentials.password;
  window.open(url.href, "_blank", "noopener,noreferrer");
}
