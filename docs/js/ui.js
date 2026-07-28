import prettyBytes from "https://cdn.jsdelivr.net/npm/pretty-bytes@7.1.1/index.js";

/** Reused across rows; constructing a formatter per cell is expensive. */
const mtimeFormat = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatMtime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return mtimeFormat.format(d);
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
