import { parseIncremental } from "@/lib/core/incremental";
import { parse } from "@/lib/core/parser";

describe("incremental parser", () => {
  test("reparses the changed paragraph and reuses unchanged paragraphs", () => {
    const before = "一\n二\n三";
    const previous = parse(before);
    const result = parseIncremental(before, "一\n変更\n三", previous);
    expect(result.reparsedRanges).toEqual([{ from: 2, to: 4 }]);
    expect(result.reusedBlocks).toBe(2);
    expect(result.document.children[0]).toBe(previous.document.children[0]);
  });
  test("multiple paragraph changes equal a full parse", () => {
    const before = "一\n二\n三\n四";
    const after = "一\nA\nB\n四";
    expect(parseIncremental(before, after, parse(before)).document).toEqual(
      parse(after).document,
    );
  });
  test("no change reuses all blocks", () => {
    const previous = parse("一\n二");
    expect(parseIncremental("一\n二", "一\n二", previous).reusedBlocks).toBe(2);
  });
});
