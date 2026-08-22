export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null>>,
): string {
  const esc = (v: string | number | null) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) lines.push(row.map(esc).join(","));
  return `\uFEFF${lines.join("\r\n")}`;
}
