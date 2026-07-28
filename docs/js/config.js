/**
 * Read / write `url` & `path` from the query string.
 *
 * Credentials and the known-host list live in Alpine `$persist` state; the only storage
 * concern left here is migrating credentials written by earlier versions.
 */

const LEGACY_CREDENTIALS_PREFIX = "webdav-index:creds:";
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
  window.history.replaceState(null, "", buildAppSearch({ webdavBaseUrl: normalized, path: "/" }));
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
 * Navigate to a directory path via `path` query param, using pushState so the browser
 * back button works.
 * @param {string} path Directory path like `/photos/2024/`
 * @param {{ replace?: boolean }} [options]
 */
export function setPath(path, options = {}) {
  const next = normalizePath(path);
  const href = buildAppSearch({ path: next });

  if (options.replace || next === getPath()) {
    window.history.replaceState(null, "", href);
  } else {
    window.history.pushState(null, "", href);
  }
}

/**
 * Fold credentials stored under the old per-URL keys (`webdav-index:creds:<url>`) into a
 * single object and drop the old keys, so saved logins survive the storage change.
 * @returns {Record<string, { username: string, password: string }>}
 */
export function takeLegacyCredentials() {
  /** @type {Record<string, { username: string, password: string }>} */
  const migrated = {};
  /** Only keys whose credentials made it across are removed; nothing is dropped blindly. */
  const movedKeys = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LEGACY_CREDENTIALS_PREFIX)) continue;

    const baseUrl = normalizeBaseUrl(key.slice(LEGACY_CREDENTIALS_PREFIX.length));
    if (!baseUrl) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "");
      if (parsed && typeof parsed.username === "string" && typeof parsed.password === "string") {
        migrated[baseUrl] = { username: parsed.username, password: parsed.password };
        movedKeys.push(key);
      }
    } catch {
      // unreadable entry, leave it alone
    }
  }

  movedKeys.forEach((key) => localStorage.removeItem(key));
  return migrated;
}
