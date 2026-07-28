import { createClient } from "https://cdn.jsdelivr.net/npm/webdav@5.10.0/dist/web/index.js";

function normalizeCredentials(credentials) {
  return {
    username: credentials?.username || "",
    password: credentials?.password || "",
  };
}

function isAnonymous({ username, password }) {
  return username === "" && password === "";
}

/**
 * The client's own Basic auth support base64-encodes as Latin1 and throws on non-ASCII
 * credentials, so the header is built here and passed through as a custom header instead.
 * Keeping the client on `AuthType.None` also makes `getFileDownloadLink` return a clean
 * URL, which lets `URL` percent-encode the userinfo properly.
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

let cachedClient = null;

/**
 * Anonymous access sends no `Authorization` at all: an empty Basic token would still make
 * the preflight ask for the header, which servers that only allow `Depth` would reject.
 */
function getClient(baseUrl, credentials) {
  const key = `${baseUrl}\u0000${credentials.username}\u0000${credentials.password}`;
  if (!cachedClient || cachedClient.key !== key) {
    const options = isAnonymous(credentials)
      ? {}
      : { headers: { Authorization: basicAuthHeader(credentials.username, credentials.password) } };
    cachedClient = { key, client: createClient(baseUrl, options) };
  }
  return cachedClient.client;
}

export async function listDirectory(baseUrl, relativePath, credentials) {
  const creds = normalizeCredentials(credentials);
  const client = getClient(baseUrl, creds);
  const currentPath = relativePath || "/";

  let result;
  try {
    // `details` exposes the raw props, the only way to tell a 0-byte file from a
    // server that omits `getcontentlength` (both surface as `size: 0`).
    result = await client.getDirectoryContents(currentPath, { details: true });
  } catch (err) {
    throw toAppError(err, isAnonymous(creds));
  }

  return result.data
    .filter((item) => isImmediateChild(currentPath, item.filename))
    .map(toEntry)
    .sort(compareEntries);
}

/**
 * `Depth: 1` is the server's job; some implementations over-report, so keep filtering
 * to direct children ourselves.
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

function compareEntries(a, b) {
  if (a.isCollection !== b.isCollection) return a.isCollection ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/**
 * Translate client errors into the `code`-tagged errors the app branches on. The client
 * throws `Error` with `status` for HTTP failures, and lets `fetch` rejections
 * (network / CORS) through as `TypeError`.
 */
function toAppError(err, anonymous) {
  const status = err?.status;

  if (status === 401 || status === 403) {
    const error = new Error(
      anonymous
        ? "This WebDAV server requires authentication. Please enter a username and password."
        : "Authentication failed. Please check your username and password.",
    );
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
 */
export function openFile(baseUrl, relativePath, credentials) {
  const creds = normalizeCredentials(credentials);
  const client = getClient(baseUrl, creds);
  const url = new URL(client.getFileDownloadLink(relativePath));
  if (!isAnonymous(creds)) {
    // The URL setters percent-encode, unlike the client's own userinfo injection.
    url.username = creds.username;
    url.password = creds.password;
  }
  window.open(url.href, "_blank", "noopener,noreferrer");
}
