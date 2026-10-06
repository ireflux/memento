const TZ = "Asia/Shanghai";

/**
 * 统一走 hourCycle: "h23"（00–23）而非 hour12: false。
 * hour12: false 在部分 ICU 版本下等价于 h24，会把 00:xx 渲染成 "24:00"。
 */
function zhDateTime(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: TZ, ...options });
}

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
    const time = zhDateTime({
      hour: "numeric",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);
    return `${date} · ${time}`;
  } catch {
    return d.toLocaleString();
  }
}

export function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return zhDateTime({
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

/**
 * CSV 导出用：本地时区的「YYYY-MM-DD HH:mm」。
 * 必须显式格式化——直接截取 toISOString() 得到的是 UTC，
 * 会让国内主人看到的时间整体早 8 小时。
 */
export function formatDateTimeMinute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return zhDateTime({
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(d)
    .replace(/\//g, "-")
    .trim();
}
