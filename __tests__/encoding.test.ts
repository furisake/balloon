import iconv from "iconv-lite";
import {
  decodeText,
  encodeShiftJis,
  findUnencodableCharacters,
  gaijiSuggestion,
  ShiftJisEncodeError,
} from "@/lib/encoding";

describe("encoding", () => {
  test("detects UTF-8", () =>
    expect(decodeText(Buffer.from("青空", "utf8"))).toEqual({
      text: "青空",
      encoding: "UTF-8",
    }));
  test("detects Shift_JIS", () =>
    expect(decodeText(iconv.encode("青空", "shift_jis"))).toEqual({
      text: "青空",
      encoding: "Shift_JIS",
    }));
  test("encodes Shift_JIS with CRLF", () =>
    expect(
      iconv.decode(Buffer.from(encodeShiftJis("一\n二")), "shift_jis"),
    ).toBe("一\r\n二"));
  test("finds every unencodable character with its UTF-16 offset", () =>
    expect(findUnencodableCharacters("a😀b🛩")).toEqual([
      { character: "😀", index: 1 },
      { character: "🛩", index: 4 },
    ]));
  test("stops export for an unencodable character", () =>
    expect(() => encodeShiftJis("😀")).toThrow(ShiftJisEncodeError));
  test("maps a known gaiji suggestion", () =>
    expect(gaijiSuggestion("𠮷")).toContain("吉"));
});
