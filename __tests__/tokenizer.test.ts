import { tokenize } from "@/lib/core/tokenizer";

describe("tokenize", () => {
  test("text, ruby, annotation, and newline keep source ranges", () => {
    const source = "漢字《かんじ》\n章［＃大見出し］";
    const tokens = tokenize(source);
    expect(tokens.map((token) => token.type)).toEqual([
      "text",
      "ruby",
      "newline",
      "text",
      "annotation",
    ]);
    for (const token of tokens)
      expect(source.slice(token.sourceRange.from, token.sourceRange.to)).toBe(
        token.value,
      );
  });
});
