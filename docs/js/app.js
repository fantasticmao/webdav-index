import {
  getWebdavBaseUrl,
  normalizeBaseUrl,
  setWebdavBaseUrlInQuery,
  getCredentials,
  setCredentials,
  clearCredentials,
  getPath,
  setPath,
  buildAppSearch,
} from "./config.js";
import { listDirectory, openFile } from "./webdav.js";
import { renderBreadcrumb, renderListing, showStatus, hideListing, hideBreadcrumb } from "./ui.js";

const connectModalEl = document.getElementById("connect-modal");
const connectForm = document.getElementById("connect-form");
const inputUrl = document.getElementById("input-webdav-url");
const inputUser = document.getElementById("input-username");
const inputPass = document.getElementById("input-password");
const connectError = document.getElementById("connect-error");
const connectSpinner = document.getElementById("connect-spinner");
const btnConnect = document.getElementById("btn-connect");
const btnSignout = document.getElementById("btn-signout");
const navSession = document.getElementById("nav-session");
const navHost = document.getElementById("nav-host");

const connectModal = new window.bootstrap.Modal(connectModalEl);

/** @type {string|null} */
let activeBaseUrl = null;

/**
 * @param {string|null} baseUrl
 */
function updateNavSession(baseUrl) {
  if (!baseUrl) {
    navSession.classList.add("d-none");
    navHost.textContent = "";
    return;
  }
  try {
    navHost.textContent = new URL(baseUrl).host;
    navSession.classList.remove("d-none");
  } catch {
    navSession.classList.add("d-none");
    navHost.textContent = "";
  }
}

function showConnectError(msg) {
  if (!msg) {
    connectError.classList.add("d-none");
    connectError.textContent = "";
    return;
  }
  connectError.textContent = msg;
  connectError.classList.remove("d-none");
}

function setConnecting(busy) {
  btnConnect.disabled = busy;
  connectSpinner.classList.toggle("d-none", !busy);
}

/**
 * @param {{ requireCredentials?: boolean }} [opts]
 */
function openConnectModal(opts = {}) {
  const { requireCredentials = true } = opts;
  const fromQuery = getWebdavBaseUrl();
  inputUrl.value = fromQuery || activeBaseUrl || "";
  inputUser.value = "";
  inputPass.value = "";
  showConnectError("");
  connectForm.classList.remove("was-validated");

  if (!fromQuery && !activeBaseUrl) {
    document.getElementById("connect-hint").textContent =
      "Enter the WebDAV URL and credentials. After connecting, the URL is saved in the address bar for refresh or sharing.";
  } else {
    document.getElementById("connect-hint").textContent =
      "Enter your credentials to browse. You can change the WebDAV URL if needed.";
  }

  if (!requireCredentials && fromQuery) {
    const creds = getCredentials(fromQuery);
    if (creds) {
      activeBaseUrl = fromQuery;
      loadCurrentDirectory();
      return;
    }
  }

  connectModal.show();
  queueMicrotask(() => {
    if (!inputUrl.value) inputUrl.focus();
    else inputUser.focus();
  });
}

connectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showConnectError("");

  const normalized = normalizeBaseUrl(inputUrl.value);
  if (!normalized) {
    inputUrl.classList.add("is-invalid");
    connectForm.classList.add("was-validated");
    return;
  }
  inputUrl.classList.remove("is-invalid");

  const username = inputUser.value;
  const password = inputPass.value;
  if (!username || !password) {
    connectForm.classList.add("was-validated");
    return;
  }

  setConnecting(true);
  try {
    const browsePath = getPath();
    await listDirectory(normalized, browsePath, { username, password });
    setWebdavBaseUrlInQuery(normalized);
    setCredentials(normalized, username, password);
    activeBaseUrl = normalized;
    updateNavSession(normalized);
    connectModal.hide();
    loadCurrentDirectory();
  } catch (err) {
    if (err.code === "AUTH") {
      showConnectError(err.message);
    } else if (err.code === "NETWORK") {
      showConnectError(err.message);
    } else {
      showConnectError(err.message || "Connection failed");
    }
  } finally {
    setConnecting(false);
  }
});

btnSignout.addEventListener("click", () => {
  const base = activeBaseUrl || getWebdavBaseUrl();
  if (base) clearCredentials(base);
  activeBaseUrl = null;
  updateNavSession(null);
  hideListing();
  hideBreadcrumb();
  showStatus("hidden");
  openConnectModal({ requireCredentials: true });
});

function onPathChange() {
  if (!activeBaseUrl) return;
  const creds = getCredentials(activeBaseUrl);
  if (!creds) {
    openConnectModal({ requireCredentials: true });
    return;
  }
  loadCurrentDirectory();
}

window.addEventListener("popstate", onPathChange);
window.addEventListener("app:pathchange", onPathChange);

async function loadCurrentDirectory() {
  const base = activeBaseUrl || getWebdavBaseUrl();
  if (!base) {
    openConnectModal({ requireCredentials: true });
    return;
  }
  activeBaseUrl = base;
  const creds = getCredentials(base);
  if (!creds) {
    updateNavSession(null);
    openConnectModal({ requireCredentials: true });
    return;
  }
  updateNavSession(base);

  const path = getPath();
  hideListing();
  showStatus("loading", "Loading directory…");
  renderBreadcrumb(path, (p) => setPath(p), buildAppSearch);

  try {
    const entries = await listDirectory(base, path, creds);
    showStatus("hidden");
    renderListing(entries, {
      onOpenDir: (p) => setPath(p),
      onOpenFile: (p) => openFile(base, p, creds),
    });
  } catch (err) {
    hideListing();
    if (err.code === "AUTH") {
      clearCredentials(base);
      activeBaseUrl = null;
      updateNavSession(null);
      showStatus("hidden");
      openConnectModal({ requireCredentials: true });
      showConnectError(err.message);
      return;
    }
    showStatus("error", err.message || "Failed to load");
  }
}

(function init() {
  const base = getWebdavBaseUrl();
  if (base) {
    const creds = getCredentials(base);
    if (creds) {
      activeBaseUrl = base;
      updateNavSession(base);
      loadCurrentDirectory();
      return;
    }
  }
  openConnectModal({ requireCredentials: true });
})();
