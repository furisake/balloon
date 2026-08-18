import { parse, visibleText } from "@/lib/core/parser";

describe("parse", () => {
  test("parses ruby and plain text", () => {
    const result = parse("青空《あおぞら》へ");
    expect(result.diagnostics).toHaveLength(0);
    expect(result.document.children[0]).toMatchObject({
      type: "paragraph",
      children: [
        { type: "ruby", base: "青空", reading: "あおぞら" },
        { type: "text", value: "へ" },
      ],
    });
    expect(visibleText(result.document)).toBe("青空へ");
  });

  test.each([
    ["大", 1],
    ["中", 2],
    ["小", 3],
  ] as const)("parses %s heading", (name, level) => {
    expect(parse(`章［＃${name}見出し］`).document.children[0]).toMatchObject({
      type: "heading",
      level,
    });
  });

  test.each([
    ["大", 1],
    ["中", 2],
    ["小", 3],
  ] as const)("parses a forward-reference %s heading", (name, level) => {
    const result = parse(`女の曲線［＃「女の曲線」は${name}見出し］`);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.document.children[0]).toMatchObject({
      type: "heading",
      level,
      children: [{ type: "text", value: "女の曲線" }],
    });
  });

  test("parses a single-line full-width indent", () => {
    expect(parse("［＃７字下げ］御もとへ").document.children[0]).toMatchObject({
      type: "paragraph",
      indent: 7,
      children: [{ type: "text", value: "御もとへ" }],
    });
  });

  test("combines an indent and a forward-reference heading", () => {
    expect(
      parse("［＃５字下げ］一［＃「一」は中見出し］").document.children[0],
    ).toMatchObject({
      type: "heading",
      level: 2,
      indent: 5,
      children: [{ type: "text", value: "一" }],
    });
  });

  test("reports a mismatched forward-reference heading", () => {
    expect(
      parse("本文［＃「別の文字」は中見出し］").diagnostics,
    ).toContainEqual(
      expect.objectContaining({
        severity: "error",
        message: expect.stringContaining("一致しません"),
      }),
    );
  });

  test("parses page break", () =>
    expect(parse("［＃改ページ］").document.children[0].type).toBe(
      "pageBreak",
    ));
  test("parses gaiji and image notes", () => {
    const children = parse(
      "［＃外字、U+1234］［＃挿絵（https://www.aozora.gr.jp/a.png、横100×縦80）入る］",
    ).document.children[0];
    expect(children).toMatchObject({
      type: "paragraph",
      children: [{ type: "gaiji" }, { type: "image", width: 100, height: 80 }],
    });
  });
  test("preserves unknown notation as a note node", () =>
    expect(parse("［＃未知の注記］").document.children[0]).toMatchObject({
      type: "paragraph",
      children: [{ type: "note", value: "未知の注記" }],
    }));
  test("reports ruby without a base", () =>
    expect(parse("《よみ》").diagnostics[0]?.severity).toBe("error"));
  test("all AST nodes have source ranges", () => {
    const result = parse("章［＃大見出し］\n本文");
    expect(result.document.sourceRange).toEqual({
      from: 0,
      to: "章［＃大見出し］\n本文".length,
    });
    result.document.children.forEach((block) => {
      expect(block.sourceRange.to).toBeGreaterThanOrEqual(
        block.sourceRange.from,
      );
      if ("children" in block)
        block.children.forEach((child) =>
          expect(child.sourceRange.to).toBeGreaterThan(child.sourceRange.from),
        );
    });
  });
});
