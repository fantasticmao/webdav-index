const LEGACY_CREDENTIALS_PREFIX = "webdav-index:creds:";
const URL_PARAM = "url";
const PATH_PARAM = "path";

export function getWebdavBaseUrl() {
  const raw = new URLSearchParams(window.location.search).get(URL_PARAM);
  return normalizeBaseUrl(raw);
}

/** Rejects non-http(s) URLs; the result always ends with a slash. */
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

/** Directory path convention: leading `/`, trailing `/`, root is `/`. */
export function normalizePath(value) {
  let p = value || "/";
  try {
    p = decodeURIComponent(p);
  } catch {
    // not valid percent-encoding, keep as-is
  }
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/+/g, "/");
  if (p !== "/" && !p.endsWith("/")) p += "/";
  return p;
}

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

export function setWebdavBaseUrlInQuery(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return;
  window.history.replaceState(null, "", buildAppSearch({ webdavBaseUrl: normalized }));
}

export function setActiveHostInQuery(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return;
  window.history.replaceState(null, "", buildAppSearch({ webdavBaseUrl: normalized, path: "/" }));
}

export function getPath() {
  const raw = new URLSearchParams(window.location.search).get(PATH_PARAM);
  return normalizePath(raw || "/");
}

export function setPath(path, options = {}) {
  const next = normalizePath(path);
  const href = buildAppSearch({ path: next });

  // pushState, so directory navigation is undoable with the browser back button.
  if (options.replace || next === getPath()) {
    window.history.replaceState(null, "", href);
  } else {
    window.history.pushState(null, "", href);
  }
}

/**
 * Fold credentials stored under the old per-URL keys (`webdav-index:creds:<url>`) into a
 * single object and drop the old keys, so saved logins survive the storage change.
 */
export function takeLegacyCredentials() {
  const migrated = {};
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
