/**
 * DOM helpers: breadcrumbs, listing table, status messages.
 */

/**
 * @param {string} path e.g. `/photos/2024/`
 * @param {(path: string) => void} onNavigate
 * @param {(overrides: { path?: string }) => string} buildHref
 */
export function renderBreadcrumb(path, onNavigate, buildHref) {
  const nav = document.getElementById("breadcrumb-nav");
  const ol = document.getElementById("breadcrumb");
  if (!nav || !ol) return;

  nav.classList.remove("d-none");
  ol.replaceChildren();

  const segments = path.split("/").filter(Boolean);

  const rootLi = document.createElement("li");
  rootLi.className = "breadcrumb-item";
  if (segments.length === 0) {
    rootLi.classList.add("active");
    rootLi.setAttribute("aria-current", "page");
    rootLi.textContent = "Root";
  } else {
    const a = document.createElement("a");
    a.href = buildHref({ path: "/" });
    a.textContent = "Root";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      onNavigate("/");
    });
    rootLi.appendChild(a);
  }
  ol.appendChild(rootLi);

  let acc = "";
  segments.forEach((seg, i) => {
    acc += "/" + seg;
    const isLast = i === segments.length - 1;
    const li = document.createElement("li");
    li.className = "breadcrumb-item";
    if (isLast) {
      li.classList.add("active");
      li.setAttribute("aria-current", "page");
      li.textContent = seg;
    } else {
      const target = acc + "/";
      const a = document.createElement("a");
      a.href = buildHref({ path: target });
      a.textContent = seg;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        onNavigate(target);
      });
      li.appendChild(a);
    }
    ol.appendChild(li);
  });
}

/**
 * @param {import('./webdav.js').WebDavEntry[]} entries
 * @param {{
 *   onOpenDir: (path: string) => void,
 *   onOpenFile: (path: string) => void,
 * }} handlers
 */
export function renderListing(entries, handlers) {
  const area = document.getElementById("listing-area");
  const tbody = document.getElementById("listing-body");
  if (!area || !tbody) return;

  area.classList.remove("d-none");
  tbody.replaceChildren();

  if (entries.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.className = "text-muted text-center py-4";
    td.textContent = "(empty)";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const entry of entries) {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.className = "col-name";
    const link = document.createElement("a");
    link.href = "#";
    link.className = "listing-link";

    const icon = document.createElement("i");
    icon.className = entry.isCollection
      ? "bi bi-folder-fill me-2 text-warning"
      : "bi bi-file-earmark me-2 text-secondary";
    icon.setAttribute("aria-hidden", "true");
    link.appendChild(icon);

    const label = document.createTextNode(
      entry.isCollection ? ensureTrailingSlash(entry.name) : entry.name,
    );
    link.appendChild(label);

    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (entry.isCollection) {
        handlers.onOpenDir(entry.relativePath);
      } else {
        handlers.onOpenFile(entry.relativePath);
      }
    });
    nameTd.appendChild(link);
    tr.appendChild(nameTd);

    const mtimeTd = document.createElement("td");
    mtimeTd.className = "col-mtime text-nowrap text-secondary";
    mtimeTd.textContent = formatMtime(entry.lastModified);
    tr.appendChild(mtimeTd);

    const sizeTd = document.createElement("td");
    sizeTd.className = "col-size text-end text-nowrap text-secondary";
    sizeTd.textContent = entry.isCollection ? "-" : formatSize(entry.size);
    tr.appendChild(sizeTd);

    tbody.appendChild(tr);
  }
}

function ensureTrailingSlash(name) {
  return name.endsWith("/") ? name : name + "/";
}

/**
 * @param {string|null} value
 */
function formatMtime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

/**
 * @param {number|null} bytes
 */
export function formatSize(bytes) {
  if (bytes == null || !Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = -1;
  do {
    v /= 1024;
    i += 1;
  } while (v >= 1024 && i < units.length - 1);
  return v.toFixed(2) + " " + units[i];
}

/**
 * @param {'loading'|'error'|'hidden'|'info'} type
 * @param {string} [message]
 */
export function showStatus(type, message = "") {
  const el = document.getElementById("status-area");
  if (!el) return;

  if (type === "hidden") {
    el.className = "d-none";
    el.replaceChildren();
    return;
  }

  el.classList.remove("d-none");

  if (type === "loading") {
    el.className = "text-center py-5";
    el.innerHTML = `
      <div class="spinner-border text-secondary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="mt-2 text-muted small">${escapeHtml(message || "Loading…")}</div>
    `;
    return;
  }

  const alertClass = type === "error" ? "alert-danger" : "alert-secondary";
  el.className = "";
  el.innerHTML = `<div class="alert ${alertClass} mb-0" role="alert">${escapeHtml(message)}</div>`;
}

export function hideListing() {
  const area = document.getElementById("listing-area");
  if (area) area.classList.add("d-none");
}

export function hideBreadcrumb() {
  const nav = document.getElementById("breadcrumb-nav");
  if (nav) nav.classList.add("d-none");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
