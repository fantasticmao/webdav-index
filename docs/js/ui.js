import prettyBytes from "https://cdn.jsdelivr.net/npm/pretty-bytes@7.1.1/index.js";

const pad2 = (value) => String(value).padStart(2, "0");

/** `yyyy-MM-dd HH:mm` in the viewer's local time zone. */
export function formatMtime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return `${date} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatSize(bytes) {
  if (bytes == null || !Number.isFinite(bytes)) return "-";
  return prettyBytes(bytes, { binary: true });
}

export function buildCrumbs(path, buildHref) {
  const segments = path.split("/").filter(Boolean);
  const crumbs = [
    { label: "Root", path: "/", href: buildHref("/"), isLast: segments.length === 0 },
  ];

  let acc = "";
  segments.forEach((segment, i) => {
    acc += "/" + segment;
    const target = acc + "/";
    crumbs.push({
      label: segment,
      path: target,
      href: buildHref(target),
      isLast: i === segments.length - 1,
    });
  });
  return crumbs;
}
