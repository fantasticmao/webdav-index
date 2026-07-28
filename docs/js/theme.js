const STORAGE_KEY = "webdav-index:theme";

/** Stored preference, or the OS preference when the user has never chosen. */
export function resolveTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
}

export function storeTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
}
