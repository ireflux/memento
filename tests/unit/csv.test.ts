import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("prepends BOM and joins rows with CRLF", () => {
    const csv = toCsv(["姓名", "人数"], [
      ["张三", 2],
      ["李四", 1],
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const body = csv.slice(1);
    expect(body).toBe("姓名,人数\r\n张三,2\r\n李四,1");
  });

  it("escapes commas, quotes and newlines", () => {
    const body = toCsv(["备注"], [['他说"来"，好\n呀']]).slice(1);
    expect(body).toBe('备注\r\n"他说""来""，好\n呀"');
  });

  it("renders null as empty cell", () => {
    const body = toCsv(["a", "b"], [[null, "x"]]).slice(1);
    expect(body).toBe("a,b\r\n,x");
  });
});
