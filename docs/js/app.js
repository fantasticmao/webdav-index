import Alpine from "https://cdn.jsdelivr.net/npm/alpinejs@3.15.12/dist/module.esm.min.js";
import persist from "https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.15.12/dist/module.esm.min.js";
import {
  getWebdavBaseUrl,
  normalizeBaseUrl,
  setWebdavBaseUrlInQuery,
  setActiveHostInQuery,
  getPath,
  setPath,
  buildAppSearch,
  takeLegacyCredentials,
} from "./config.js";
import { listDirectory, openFile } from "./webdav.js";
import { applyTheme, resolveTheme, storeTheme } from "./theme.js";
import { buildCrumbs, formatMtime, formatSize } from "./ui.js";

Alpine.plugin(persist);

Alpine.data("app", () => ({
  /** Active WebDAV base URL, or null when there is no session. */
  baseUrl: null,
  path: "/",
  entries: [],
  loading: false,
  errorMessage: "",
  /** Incremented per load so a superseded request cannot clobber newer state. */
  loadToken: 0,

  /** Known hosts, most recently used first. */
  hosts: Alpine.$persist([]).as("webdav-index:hosts"),
  /** `{ [baseUrl]: { username, password } }` */
  credentials: Alpine.$persist({}).as("webdav-index:creds"),

  /** The inline snippet in index.html already applied this to `<html>`. */
  theme: resolveTheme(),

  form: { url: "", username: "", password: "" },
  connecting: false,
  connectError: "",
  connectHint: "",
  connectCancellable: false,
  showValidation: false,
  modal: null,

  formatMtime,
  formatSize,

  init() {
    Object.assign(this.credentials, takeLegacyCredentials());
    this.hosts = this.hosts
      .map((host) => normalizeBaseUrl(host))
      .filter((host, i, all) => host && all.indexOf(host) === i);

    window.addEventListener("popstate", () => {
      if (this.baseUrl) this.load();
    });

    // `init()` runs before Alpine walks the children, so `$refs` is only complete on the
    // next tick.
    this.$nextTick(() => {
      this.modal = new window.bootstrap.Modal(this.$refs.connectModal);
      // `hide.bs.modal` contains dots, which Alpine would parse as event modifiers.
      this.$refs.connectModal.addEventListener("hide.bs.modal", (event) => {
        if (!this.connectCancellable && !this.baseUrl) event.preventDefault();
      });

      const base = getWebdavBaseUrl();
      if (base && this.credentialsFor(base)) {
        this.baseUrl = base;
        this.rememberHost(base);
        this.load();
        return;
      }
      this.openConnect();
    });
  },

  get crumbs() {
    return buildCrumbs(this.path, (path) => buildAppSearch({ path }));
  },

  /** Flipping it makes the choice explicit; until then the OS preference is followed. */
  toggleTheme() {
    this.theme = this.theme === "dark" ? "light" : "dark";
    applyTheme(this.theme);
    storeTheme(this.theme);
  },

  credentialsFor(baseUrl) {
    const entry = baseUrl ? this.credentials[baseUrl] : null;
    if (!entry || typeof entry.username !== "string" || typeof entry.password !== "string") {
      return null;
    }
    return { username: entry.username, password: entry.password };
  },

  rememberHost(baseUrl) {
    if (this.hosts[0] === baseUrl) return;
    this.hosts = [baseUrl, ...this.hosts.filter((host) => host !== baseUrl)];
  },

  forgetHost(baseUrl) {
    this.hosts = this.hosts.filter((host) => host !== baseUrl);
    delete this.credentials[baseUrl];
  },

  /** Hosts we could switch to without asking for credentials again. */
  get signedInHosts() {
    return this.hosts.filter((host) => this.credentialsFor(host));
  },

  /**
   * `type="url"` accepts any scheme, so the http(s)-only constraint is reported through
   * the Constraint Validation API and rendered by the form's `.invalid-feedback`.
   */
  syncUrlValidity() {
    this.$refs.inputUrl.setCustomValidity(
      normalizeBaseUrl(this.form.url) ? "" : "Please enter a valid http(s) URL",
    );
  },

  openConnect(options = {}) {
    const { prefillUrl = null, cancellable = false } = options;
    const fromQuery = getWebdavBaseUrl();

    this.connectCancellable = cancellable;
    this.form.url = prefillUrl !== null ? prefillUrl : fromQuery || this.baseUrl || "";
    this.form.username = "";
    this.form.password = "";
    this.connectError = "";
    this.showValidation = false;
    this.$refs.inputUrl.setCustomValidity("");

    if (!fromQuery && !this.baseUrl && !prefillUrl) {
      this.connectHint =
        "Enter the WebDAV URL and credentials. After connecting, the URL is saved in the address bar for refresh or sharing.";
    } else if (cancellable) {
      this.connectHint = "Enter another WebDAV URL and credentials to connect.";
    } else {
      this.connectHint =
        "Enter your credentials to browse. You can change the WebDAV URL if needed.";
    }

    this.modal.show();
    queueMicrotask(() => {
      (this.form.url ? this.$refs.inputUsername : this.$refs.inputUrl).focus();
    });
  },

  openConnectAnother() {
    this.openConnect({ prefillUrl: "", cancellable: true });
  },

  async connect() {
    this.connectError = "";
    this.syncUrlValidity();
    if (!this.$refs.connectForm.checkValidity()) {
      this.showValidation = true;
      return;
    }

    const baseUrl = normalizeBaseUrl(this.form.url);
    const credentials = { username: this.form.username, password: this.form.password };
    const switchingHost = this.baseUrl !== baseUrl;

    this.connecting = true;
    try {
      // Probe before persisting anything, so bad credentials never get saved.
      await listDirectory(baseUrl, switchingHost ? "/" : this.path, credentials);

      if (switchingHost) {
        setActiveHostInQuery(baseUrl);
      } else {
        setWebdavBaseUrlInQuery(baseUrl);
      }
      this.credentials[baseUrl] = credentials;
      this.rememberHost(baseUrl);
      this.baseUrl = baseUrl;
      this.connectCancellable = false;
      this.modal.hide();
      this.load();
    } catch (err) {
      this.connectError = err.message || "Connection failed";
    } finally {
      this.connecting = false;
    }
  },

  /** Switch to another known host; resets the path to `/`. */
  switchHost(host) {
    const baseUrl = normalizeBaseUrl(host);
    if (!baseUrl || baseUrl === this.baseUrl) return;

    setActiveHostInQuery(baseUrl);
    if (this.credentialsFor(baseUrl)) {
      this.baseUrl = baseUrl;
      this.rememberHost(baseUrl);
      this.load();
      return;
    }
    this.openConnect({ prefillUrl: baseUrl, cancellable: !!this.baseUrl });
  },

  signOut() {
    const baseUrl = this.baseUrl || getWebdavBaseUrl();
    if (baseUrl) this.forgetHost(baseUrl);

    const remaining = this.signedInHosts;
    this.baseUrl = null;
    this.entries = [];
    this.errorMessage = "";

    if (remaining.length > 0) {
      this.switchHost(remaining[0]);
      return;
    }
    this.openConnect();
  },

  navigate(path) {
    setPath(path);
    this.load();
  },

  openEntry(entry) {
    if (entry.isCollection) {
      this.navigate(entry.relativePath);
      return;
    }
    const credentials = this.credentialsFor(this.baseUrl);
    if (credentials) openFile(this.baseUrl, entry.relativePath, credentials);
  },

  async load() {
    const baseUrl = this.baseUrl || getWebdavBaseUrl();
    const credentials = this.credentialsFor(baseUrl);
    if (!baseUrl || !credentials) {
      this.baseUrl = null;
      this.openConnect();
      return;
    }

    this.baseUrl = baseUrl;
    this.rememberHost(baseUrl);
    this.path = getPath();
    this.entries = [];
    this.errorMessage = "";
    this.loading = true;
    const token = ++this.loadToken;

    try {
      const entries = await listDirectory(baseUrl, this.path, credentials);
      if (token !== this.loadToken) return;
      this.entries = entries;
      this.loading = false;
    } catch (err) {
      if (token !== this.loadToken) return;
      if (err.code === "AUTH") {
        // Ownership of `loading` passes to whatever this starts next.
        this.handleAuthFailure(baseUrl, err);
        return;
      }
      this.loading = false;
      this.errorMessage = err.message || "Failed to load";
    }
  },

  /** Stale credentials: drop them, fall back to another signed-in host if there is one. */
  handleAuthFailure(baseUrl, err) {
    this.forgetHost(baseUrl);
    const remaining = this.signedInHosts;
    this.baseUrl = null;
    this.entries = [];

    if (remaining.length > 0) {
      this.switchHost(remaining[0]);
      return;
    }
    this.loading = false;
    this.openConnect();
    this.connectError = err.message;
  },
}));

Alpine.start();
