const URL_PARAM = "url";
const PATH_PARAM = "path";

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

export function getWebdavBaseUrl() {
  const raw = new URLSearchParams(window.location.search).get(URL_PARAM);
  return normalizeBaseUrl(raw);
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

/** Directory path convention: leading `/`, trailing `/`, root is `/`. */
function normalizePath(value) {
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

export function getPath() {
  const raw = new URLSearchParams(window.location.search).get(PATH_PARAM);
  return normalizePath(raw || "/");
}

export function setPath(path) {
  const next = normalizePath(path);
  const href = buildAppSearch({ path: next });

  // pushState, so directory navigation is undoable with the browser back button.
  if (next === getPath()) {
    window.history.replaceState(null, "", href);
  } else {
    window.history.pushState(null, "", href);
  }
}

export function isMixedContentRequest(baseUrl) {
  if (window.location.protocol !== "https:") return false;
  try {
    return new URL(baseUrl).protocol === "http:";
  } catch {
    return false;
  }
}

export function isPrivateNetworkAccess(baseUrl) {
  if (isPrivateOrLocalHostname(window.location.hostname)) return false;
  try {
    return isPrivateOrLocalHostname(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
}

function isPrivateOrLocalHostname(hostname) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (host === "::1") return true;
  // IPv6 ULA fc00::/7 and link-local fe80::/10.
  if (/^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host)) return true;
  return false;
}
