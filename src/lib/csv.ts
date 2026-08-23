/**
 * 防公式注入（OWASP CSV Injection）：以 = + - @ 或制表符/回车开头的单元格
 * 在 Excel / WPS 中会被当作公式求值，统一加前缀 `'` 中和。
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null>>,
): string {
  const esc = (v: string | number | null) => {
    if (v == null) return "";
    let s = String(v);
    if (FORMULA_PREFIX.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) lines.push(row.map(esc).join(","));
  return `\uFEFF${lines.join("\r\n")}`;
}
