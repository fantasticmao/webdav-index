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
