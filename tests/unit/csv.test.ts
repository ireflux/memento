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

  it("neutralizes formula injection prefixes (OWASP)", () => {
    const body = toCsv(
      ["姓名", "备注"],
      [
        ["=HYPERLINK(\"http://evil.com\")", "正常"],
        ["+1|cmd", "@SUM(A1)"],
        ["-2", "\tTAB"],
      ],
    ).slice(1);
    expect(body).toBe(
      '姓名,备注\r\n"\'=HYPERLINK(""http://evil.com"")",正常\r\n\'+1|cmd,\'@SUM(A1)\r\n\'-2,\'\tTAB',
    );
  });

  it("does not touch ordinary cells", () => {
    const body = toCsv(["手机号"], [["13800138000"]]).slice(1);
    expect(body).toBe("手机号\r\n13800138000");
  });
});
