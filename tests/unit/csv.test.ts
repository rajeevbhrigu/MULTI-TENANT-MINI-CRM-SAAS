import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("escapes commas, quotes and newlines", () => {
    const csv = toCsv(
      [{ name: 'Acme, "The" Co', note: "line1\nline2" }],
      ["name", "note"],
    );
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,note");
    expect(lines[1]).toContain('"Acme, ""The"" Co"');
  });

  it("renders null/undefined as empty string", () => {
    const csv = toCsv([{ a: null, b: undefined }], ["a", "b"]);
    expect(csv).toBe("a,b\n,");
  });
});
