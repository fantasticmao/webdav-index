/**
 * Bootstrap color mode (`data-bs-theme`) state.
 */

const STORAGE_KEY = "webdav-index:theme";

/** @typedef {"light"|"dark"} Theme */

/**
 * Stored preference, or the OS preference when the user has never chosen.
 * @returns {Theme}
 */
export function resolveTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** @param {Theme} theme */
export function applyTheme(theme) {
  document.documentElement.setAttribute("data-bs-theme", theme);
}

/** @param {Theme} theme */
export function storeTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
}
