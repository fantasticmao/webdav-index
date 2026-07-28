/**
 * Read / write `url` & `path` from query string;
 * Basic credentials and known hosts in localStorage.
 */

const CREDENTIALS_PREFIX = "webdav-index:creds:";
const HOSTS_KEY = "webdav-index:hosts";
const URL_PARAM = "url";
const PATH_PARAM = "path";

/**
 * @returns {string|null} Normalized base URL with trailing slash, or null if missing/invalid
 */
export function getWebdavBaseUrl() {
  const raw = new URLSearchParams(window.location.search).get(URL_PARAM);
  return normalizeBaseUrl(raw);
}

/**
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
export function normalizeBaseUrl(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    let href = url.href;
    if (!href.endsWith("/")) href += "/";
    return href;
  } catch {
    return null;
  }
}

/**
 * Normalize a directory path: leading `/`, directories end with `/`, root is `/`.
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function normalizePath(value) {
  let p = value || "/";
  try {
    p = decodeURIComponent(p);
  } catch {
    // keep as-is
  }
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/+/g, "/");
  if (p !== "/" && !p.endsWith("/")) p += "/";
  return p;
}

/**
 * Build pathname + search for the app (no hash).
 * @param {{ webdavBaseUrl?: string|null, path?: string|null }} [overrides]
 * @returns {string}
 */
export function buildAppSearch(overrides = {}) {
  const params = new URLSearchParams(window.location.search);

  const base =
    overrides.webdavBaseUrl !== undefined
      ? normalizeBaseUrl(overrides.webdavBaseUrl)
      : getWebdavBaseUrl();
  if (base) {
    params.set(URL_PARAM, base);
  } else {
    params.delete(URL_PARAM);
  }

  const path = overrides.path !== undefined ? normalizePath(overrides.path) : getPath();
  if (path === "/") {
    params.delete(PATH_PARAM);
  } else {
    params.set(PATH_PARAM, path);
  }

  const qs = params.toString();
  return window.location.pathname + (qs ? "?" + qs : "");
}

/**
 * Write `url` into the query string via replaceState; keep current path.
 * @param {string} baseUrl
 */
export function setWebdavBaseUrlInQuery(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return;
  window.history.replaceState(null, "", buildAppSearch({ webdavBaseUrl: normalized }));
}

/**
 * Switch active host in the query string and reset path to `/`.
 * @param {string} baseUrl
 */
export function setActiveHostInQuery(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return;
  window.history.replaceState(
    null,
    "",
    buildAppSearch({ webdavBaseUrl: normalized, path: "/" }),
  );
}

/**
 * @returns {string[]} Normalized base URLs, most recently used first
 */
export function getKnownHosts() {
  try {
    const raw = localStorage.getItem(HOSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    /** @type {string[]} */
    const hosts = [];
    for (const item of parsed) {
      const normalized = normalizeBaseUrl(item);
      if (normalized && !hosts.includes(normalized)) hosts.push(normalized);
    }
    return hosts;
  } catch {
    return [];
  }
}

/**
 * Remember a host (move to front of the known list).
 * @param {string} baseUrl
 */
export function rememberHost(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return;
  const hosts = getKnownHosts().filter((h) => h !== normalized);
  hosts.unshift(normalized);
  localStorage.setItem(HOSTS_KEY, JSON.stringify(hosts));
}

/**
 * Remove a host from the known list.
 * @param {string} baseUrl
 */
export function forgetHost(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return;
  const hosts = getKnownHosts().filter((h) => h !== normalized);
  if (hosts.length === 0) {
    localStorage.removeItem(HOSTS_KEY);
  } else {
    localStorage.setItem(HOSTS_KEY, JSON.stringify(hosts));
  }
}

/**
 * @param {string} baseUrl
 * @returns {{ username: string, password: string } | null}
 */
export function getCredentials(baseUrl) {
  const key = CREDENTIALS_PREFIX + baseUrl;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.username !== "string" || typeof parsed.password !== "string") {
      return null;
    }
    return { username: parsed.username, password: parsed.password };
  } catch {
    return null;
  }
}

/**
 * @param {string} baseUrl
 * @param {string} username
 * @param {string} password
 */
export function setCredentials(baseUrl, username, password) {
  const key = CREDENTIALS_PREFIX + baseUrl;
  localStorage.setItem(key, JSON.stringify({ username, password }));
}

/**
 * @param {string} baseUrl
 */
export function clearCredentials(baseUrl) {
  localStorage.removeItem(CREDENTIALS_PREFIX + baseUrl);
}

/**
 * Current directory path from `path` query param.
 * @returns {string}
 */
export function getPath() {
  const raw = new URLSearchParams(window.location.search).get(PATH_PARAM);
  return normalizePath(raw || "/");
}

/**
 * Navigate to a directory path via `path` query param.
 * Uses pushState so the browser back button works; dispatches `app:pathchange`.
 * @param {string} path Directory path like `/photos/2024/`
 * @param {{ replace?: boolean }} [options]
 */
export function setPath(path, options = {}) {
  const next = normalizePath(path);
  const current = getPath();
  const href = buildAppSearch({ path: next });

  if (options.replace || next === current) {
    window.history.replaceState(null, "", href);
  } else {
    window.history.pushState(null, "", href);
  }
  window.dispatchEvent(new Event("app:pathchange"));
}
