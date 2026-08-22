const TZ = "Asia/Shanghai";

export function formatEventDateZh(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    const date = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      timeZone: TZ,
    }).format(d);
    const time = new Intl.DateTimeFormat("zh-CN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      timeZone: TZ,
    }).format(d);
    return `${date} · ${time}`;
  } catch {
    return d.toLocaleString();
  }
}

export function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(d);
}
