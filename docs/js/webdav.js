/**
 * Minimal WebDAV client: PROPFIND listing + open file in new tab with Basic auth.
 */

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
 * @param {string} username
 * @param {string} password
 * @returns {string}
 */
export function basicAuthHeader(username, password) {
  // btoa expects Latin1; for non-ASCII usernames use TextEncoder fallback
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

/**
 * Join base URL with a relative path (leading slash path from hash).
 * @param {string} baseUrl  Trailing slash
 * @param {string} relativePath  e.g. `/` or `/photos/2024/`
 * @returns {string}
 */
export function resolveUrl(baseUrl, relativePath) {
  const base = new URL(baseUrl);
  let rel = relativePath || "/";
  if (!rel.startsWith("/")) rel = "/" + rel;
  // Strip leading slash then append to base pathname
  const basePath = base.pathname.endsWith("/") ? base.pathname : base.pathname + "/";
  const suffix = rel === "/" ? "" : rel.replace(/^\//, "");
  const encodedSuffix = suffix
    .split("/")
    .map((seg) => (seg === "" ? "" : encodeURIComponent(decodeURIComponentSafe(seg))))
    .join("/");
  base.pathname = basePath + encodedSuffix;
  return base.href;
}

function decodeURIComponentSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Compute path of an entry relative to the WebDAV base URL.
 * @param {string} baseUrl
 * @param {string} href From PROPFIND (may be absolute or path-absolute)
 * @returns {string} relative path starting with /
 */
export function hrefToRelativePath(baseUrl, href) {
  const base = new URL(baseUrl);
  let path;
  try {
    const abs = new URL(href, base);
    path = abs.pathname;
  } catch {
    path = href;
  }
  path = decodeURIComponentSafe(path);

  let basePath = decodeURIComponentSafe(base.pathname);
  if (!basePath.endsWith("/")) basePath += "/";
  if (!path.startsWith("/")) path = "/" + path;

  let relative;
  if (path.startsWith(basePath)) {
    relative = "/" + path.slice(basePath.length);
  } else if (path === basePath.replace(/\/$/, "")) {
    relative = "/";
  } else {
    // Fallback: use last segment
    relative = "/" + path.split("/").filter(Boolean).pop();
  }
  relative = relative.replace(/\/+/g, "/");
  if (relative === "") relative = "/";
  return relative;
}

/**
 * @param {string} baseUrl
 * @param {string} relativePath
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<WebDavEntry[]>}
 */
export async function listDirectory(baseUrl, relativePath, credentials) {
  const url = resolveUrl(baseUrl, relativePath);
  const auth = basicAuthHeader(credentials.username, credentials.password);

  let response;
  try {
    response = await fetch(url, {
      method: "PROPFIND",
      headers: {
        Authorization: auth,
        Depth: "1",
        "Content-Type": "application/xml; charset=utf-8",
      },
      body: `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getlastmodified/>
    <d:getcontentlength/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`,
    });
  } catch (err) {
    const error = new Error(
      "Unable to reach the WebDAV server. If this is a cross-origin request, ensure the server allows CORS (PROPFIND / Authorization / Depth).",
    );
    error.cause = err;
    error.code = "NETWORK";
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    const error = new Error("Authentication failed. Please check your username and password.");
    error.code = "AUTH";
    error.status = response.status;
    throw error;
  }

  if (response.status !== 207 && response.status !== 200) {
    const error = new Error(`PROPFIND failed: HTTP ${response.status}`);
    error.code = "HTTP";
    error.status = response.status;
    throw error;
  }

  const text = await response.text();
  const entries = parseMultiStatus(text, baseUrl, relativePath);
  return entries;
}

/**
 * @param {string} xmlText
 * @param {string} baseUrl
 * @param {string} currentRelativePath
 * @returns {WebDavEntry[]}
 */
function parseMultiStatus(xmlText, baseUrl, currentRelativePath) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    const error = new Error("Failed to parse WebDAV response XML.");
    error.code = "PARSE";
    throw error;
  }

  const responses = [...doc.getElementsByTagNameNS("DAV:", "response")];
  // Some servers omit namespace or use different prefix — also try localName
  const nodes =
    responses.length > 0
      ? responses
      : [...doc.getElementsByTagName("response")].filter((el) => el.localName === "response");

  /** @type {WebDavEntry[]} */
  const entries = [];
  const currentNorm = normalizeDirPath(currentRelativePath);

  for (const node of nodes) {
    const hrefEl =
      node.getElementsByTagNameNS("DAV:", "href")[0] ||
      [...node.getElementsByTagName("href")].find((e) => e.localName === "href");
    if (!hrefEl) continue;
    const href = hrefEl.textContent?.trim() || "";
    if (!href) continue;

    const relativePath = hrefToRelativePath(baseUrl, href);
    const isCollection = hasCollection(node);

    // Skip the directory itself
    const entryNorm = isCollection ? normalizeDirPath(relativePath) : relativePath;
    if (entryNorm === currentNorm || relativePath === currentNorm.replace(/\/$/, "")) {
      continue;
    }
    // Only immediate children
    if (!isImmediateChild(currentNorm, entryNorm, isCollection)) {
      continue;
    }

    const displayNameEl =
      node.getElementsByTagNameNS("DAV:", "displayname")[0] ||
      [...node.getElementsByTagName("displayname")].find((e) => e.localName === "displayname");
    let name = displayNameEl?.textContent?.trim() || "";
    if (!name) {
      const parts = relativePath.split("/").filter(Boolean);
      name = parts[parts.length - 1] || relativePath;
    }
    if (isCollection && !name.endsWith("/")) {
      // display with slash in UI separately
    }

    const modifiedEl =
      node.getElementsByTagNameNS("DAV:", "getlastmodified")[0] ||
      [...node.getElementsByTagName("getlastmodified")].find(
        (e) => e.localName === "getlastmodified",
      );
    const lengthEl =
      node.getElementsByTagNameNS("DAV:", "getcontentlength")[0] ||
      [...node.getElementsByTagName("getcontentlength")].find(
        (e) => e.localName === "getcontentlength",
      );

    const sizeRaw = lengthEl?.textContent?.trim();
    const size = sizeRaw != null && sizeRaw !== "" ? Number(sizeRaw) : null;

    entries.push({
      name,
      hrefPath: href,
      relativePath: isCollection ? normalizeDirPath(relativePath) : relativePath.replace(/\/$/, ""),
      isCollection,
      lastModified: modifiedEl?.textContent?.trim() || null,
      size: Number.isFinite(size) ? size : null,
    });
  }

  entries.sort((a, b) => {
    if (a.isCollection !== b.isCollection) return a.isCollection ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return entries;
}

function hasCollection(responseNode) {
  const types =
    responseNode.getElementsByTagNameNS("DAV:", "resourcetype")[0] ||
    [...responseNode.getElementsByTagName("resourcetype")].find(
      (e) => e.localName === "resourcetype",
    );
  if (!types) return false;
  const collections = types.getElementsByTagNameNS("DAV:", "collection");
  if (collections.length > 0) return true;
  return [...types.getElementsByTagName("collection")].some((e) => e.localName === "collection");
}

function normalizeDirPath(path) {
  let p = path || "/";
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/+/g, "/");
  if (p !== "/" && !p.endsWith("/")) p += "/";
  return p;
}

function isImmediateChild(parentDir, childPath, childIsCollection) {
  const parent = normalizeDirPath(parentDir);
  const child = childIsCollection ? normalizeDirPath(childPath) : childPath.replace(/\/+$/, "");

  if (parent === "/") {
    const rest = child.startsWith("/") ? child.slice(1) : child;
    if (!rest) return false;
    const segments = rest.replace(/\/$/, "").split("/");
    return segments.length === 1 && segments[0] !== "";
  }

  if (!child.startsWith(parent)) return false;
  const rest = child.slice(parent.length).replace(/\/$/, "");
  if (!rest) return false;
  return !rest.includes("/");
}

/**
 * Open a file in a new browser tab using URL userinfo for Basic auth.
 * @param {string} baseUrl
 * @param {string} relativePath
 * @param {{ username: string, password: string }} credentials
 */
export function openFile(baseUrl, relativePath, credentials) {
  const url = new URL(resolveUrl(baseUrl, relativePath));
  url.username = credentials.username;
  url.password = credentials.password;
  window.open(url.href, "_blank", "noopener,noreferrer");
}
