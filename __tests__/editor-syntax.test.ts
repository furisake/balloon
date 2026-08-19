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
      { from: 10, to: 18, kind: "annotation", value: "［＃外字、説明］" },
    ]);
  });

  test("keeps ranges in source order across lines", () => {
    expect(aozoraSyntaxRanges("本文［＃改ページ］\n漢字《かんじ》")).toEqual([
      { from: 2, to: 9, kind: "annotation" },
      { from: 12, to: 17, kind: "ruby" },
    ]);
  });
});
