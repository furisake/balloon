import { aozoraSyntaxRanges } from "@/lib/editor-syntax";

describe("aozoraSyntaxRanges", () => {
  test("classifies ruby, annotation, and notation markers", () => {
    const source = "｜青空《あおぞら》※［＃外字、説明］";
    expect(
      aozoraSyntaxRanges(source).map((range) => ({
        ...range,
        value: source.slice(range.from, range.to),
      })),
    ).toEqual([
      { from: 0, to: 1, kind: "marker", value: "｜" },
      { from: 3, to: 9, kind: "ruby", value: "《あおぞら》" },
      { from: 9, to: 10, kind: "marker", value: "※" },
      { from: 10, to: 18, kind: "gaiji", value: "［＃外字、説明］" },
    ]);
  });

  test("keeps ranges in source order across lines", () => {
    expect(aozoraSyntaxRanges("本文［＃改ページ］\n漢字《かんじ》")).toEqual([
      { from: 2, to: 9, kind: "layout" },
      { from: 12, to: 17, kind: "ruby" },
    ]);
  });

  test.each([
    ["［＃ここから３字下げ］", "layout"],
    ["［＃地から２字上げ］", "layout"],
    ["［＃「第一章」は同行中見出し］", "heading"],
    ["［＃「語」に白丸傍点］", "emphasis"],
    ["［＃コンドル博士の図（fig.png、横320×縦322）入る］", "image"],
    ["［＃「喋」に「ママ」の注記］", "note"],
    ["［＃二の字点、面区点番号1-2-22］", "gaiji"],
  ] as const)("classifies %s as %s", (source, kind) => {
    expect(aozoraSyntaxRanges(source)).toEqual([
      { from: 0, to: source.length, kind },
    ]);
  });
});
