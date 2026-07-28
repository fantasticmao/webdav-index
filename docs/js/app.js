import {
  getWebdavBaseUrl,
  normalizeBaseUrl,
  setWebdavBaseUrlInQuery,
  setActiveHostInQuery,
  getCredentials,
  setCredentials,
  clearCredentials,
  getKnownHosts,
  rememberHost,
  forgetHost,
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
const btnConnectCancel = document.getElementById("btn-connect-cancel");
const btnConnectAnother = document.getElementById("btn-connect-another");
const btnSignout = document.getElementById("btn-signout");
const navSession = document.getElementById("nav-session");
const navHost = document.getElementById("nav-host");
const navHostMenu = document.getElementById("nav-host-menu");
const navHostDivider = document.getElementById("nav-host-divider");

const connectModal = new window.bootstrap.Modal(connectModalEl);

/** @type {string|null} */
let activeBaseUrl = null;

/** Whether the connect modal may be cancelled (Connect another flow). */
let connectCancellable = false;

/**
 * Display label for a WebDAV base URL (full URL).
 * @param {string} baseUrl
 * @returns {string}
 */
function formatHostLabel(baseUrl) {
  return baseUrl;
}

/**
 * @param {boolean} cancellable
 */
function setConnectModalDismissible(cancellable) {
  connectCancellable = cancellable;
  btnConnectCancel.classList.toggle("d-none", !cancellable);
}

/**
 * @param {string|null} baseUrl
 */
function updateNavSession(baseUrl) {
  if (!baseUrl) {
    navSession.classList.add("d-none");
    navHost.textContent = "";
    renderHostList(null);
    return;
  }
  navHost.textContent = formatHostLabel(baseUrl);
  navSession.classList.remove("d-none");
  renderHostList(baseUrl);
}

/**
 * Render known hosts above the divider in the nav dropdown.
 * @param {string|null} activeUrl
 */
function renderHostList(activeUrl) {
  navHostMenu.querySelectorAll("[data-host-item]").forEach((el) => el.remove());

  const hosts = getKnownHosts();
  const dividerLi = navHostDivider.parentElement;
  if (!dividerLi) return;

  for (const host of hosts) {
    const li = document.createElement("li");
    li.setAttribute("data-host-item", "");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dropdown-item nav-host-item";
    btn.title = host;
    btn.dataset.hostUrl = host;

    const isActive = host === activeUrl;
    if (isActive) btn.classList.add("active");

    const label = document.createElement("span");
    label.className = "nav-host-item-label";
    label.textContent = formatHostLabel(host);
    btn.appendChild(label);

    if (isActive) {
      const check = document.createElement("i");
      check.className = "bi bi-check-lg nav-host-item-check";
      check.setAttribute("aria-hidden", "true");
      btn.appendChild(check);
    }

    btn.addEventListener("click", () => {
      if (host === activeBaseUrl) return;
      switchHost(host);
    });

    li.appendChild(btn);
    navHostMenu.insertBefore(li, dividerLi);
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
  btnConnectCancel.disabled = busy;
}

/**
 * @param {{ requireCredentials?: boolean, prefillUrl?: string|null, cancellable?: boolean }} [opts]
 */
function openConnectModal(opts = {}) {
  const { requireCredentials = true, prefillUrl = null, cancellable = false } = opts;
  const fromQuery = getWebdavBaseUrl();

  setConnectModalDismissible(cancellable);

  if (prefillUrl !== null) {
    inputUrl.value = prefillUrl || "";
  } else {
    inputUrl.value = fromQuery || activeBaseUrl || "";
  }
  inputUser.value = "";
  inputPass.value = "";
  showConnectError("");
  connectForm.classList.remove("was-validated");

  if (!fromQuery && !activeBaseUrl && !prefillUrl) {
    document.getElementById("connect-hint").textContent =
      "Enter the WebDAV URL and credentials. After connecting, the URL is saved in the address bar for refresh or sharing.";
  } else if (cancellable) {
    document.getElementById("connect-hint").textContent =
      "Enter another WebDAV URL and credentials to connect.";
  } else {
    document.getElementById("connect-hint").textContent =
      "Enter your credentials to browse. You can change the WebDAV URL if needed.";
  }

  if (!requireCredentials && fromQuery) {
    const creds = getCredentials(fromQuery);
    if (creds) {
      activeBaseUrl = fromQuery;
      rememberHost(fromQuery);
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

/**
 * Switch to another known host; reset path to `/`.
 * @param {string} baseUrl
 */
function switchHost(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return;

  setActiveHostInQuery(normalized);
  const creds = getCredentials(normalized);
  if (creds) {
    activeBaseUrl = normalized;
    rememberHost(normalized);
    updateNavSession(normalized);
    loadCurrentDirectory();
    return;
  }

  openConnectModal({
    requireCredentials: true,
    prefillUrl: normalized,
    cancellable: !!activeBaseUrl,
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

  const switchingHost = !activeBaseUrl || activeBaseUrl !== normalized;
  const browsePath = switchingHost ? "/" : getPath();

  setConnecting(true);
  try {
    await listDirectory(normalized, browsePath, { username, password });
    if (switchingHost) {
      setActiveHostInQuery(normalized);
    } else {
      setWebdavBaseUrlInQuery(normalized);
    }
    setCredentials(normalized, username, password);
    rememberHost(normalized);
    activeBaseUrl = normalized;
    updateNavSession(normalized);
    setConnectModalDismissible(false);
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

btnConnectCancel.addEventListener("click", () => {
  connectModal.hide();
});

connectModalEl.addEventListener("hide.bs.modal", (e) => {
  if (!connectCancellable && activeBaseUrl === null) {
    e.preventDefault();
  }
});

connectModalEl.addEventListener("hidden.bs.modal", () => {
  setConnectModalDismissible(false);
});

btnConnectAnother.addEventListener("click", () => {
  openConnectModal({
    requireCredentials: true,
    prefillUrl: "",
    cancellable: true,
  });
});

btnSignout.addEventListener("click", () => {
  const base = activeBaseUrl || getWebdavBaseUrl();
  if (base) {
    clearCredentials(base);
    forgetHost(base);
  }

  const remaining = getKnownHosts().filter((h) => getCredentials(h));
  if (remaining.length > 0) {
    activeBaseUrl = null;
    switchHost(remaining[0]);
    return;
  }

  activeBaseUrl = null;
  updateNavSession(null);
  hideListing();
  hideBreadcrumb();
  showStatus("hidden");
  openConnectModal({ requireCredentials: true, cancellable: false });
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
  rememberHost(base);
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
      forgetHost(base);
      const remaining = getKnownHosts().filter((h) => getCredentials(h));
      if (remaining.length > 0) {
        activeBaseUrl = null;
        showStatus("hidden");
        switchHost(remaining[0]);
        return;
      }
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
      rememberHost(base);
      updateNavSession(base);
      loadCurrentDirectory();
      return;
    }
  }
  openConnectModal({ requireCredentials: true });
})();
