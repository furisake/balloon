import iconv from "iconv-lite";

export type TextEncoding = "UTF-8" | "Shift_JIS";

export function decodeText(bytes: Uint8Array): {
  text: string;
  encoding: TextEncoding;
} {
  const input = Buffer.from(bytes);
  const utf8Text = iconv.decode(input, "utf8");
  const roundTrip = iconv.encode(utf8Text, "utf8");
  if (!utf8Text.includes("�") && input.equals(roundTrip))
    return { text: stripBom(utf8Text), encoding: "UTF-8" };
  const text = iconv.decode(input, "shift_jis");
  if (text.includes("�"))
    throw new Error("UTF-8 / Shift_JISとして解釈できません");
  return { text, encoding: "Shift_JIS" };
}

export function encodeShiftJis(source: string): Uint8Array {
  const invalid = findUnencodableCharacters(source);
  if (invalid.length) throw new ShiftJisEncodeError(invalid);
  return iconv.encode(source.replace(/\r?\n/g, "\r\n"), "shift_jis");
}

export class ShiftJisEncodeError extends Error {
  constructor(public readonly characters: UnencodableCharacter[]) {
    super("Shift_JISへ変換できない文字があります");
  }
}

export interface UnencodableCharacter {
  character: string;
  index: number;
}

export function findUnencodableCharacters(
  source: string,
): UnencodableCharacter[] {
  const result: UnencodableCharacter[] = [];
  let index = 0;
  for (const character of source) {
    const encoded = iconv.encode(character, "shift_jis");
    const decoded = iconv.decode(encoded, "shift_jis");
    if (decoded !== character) result.push({ character, index });
    index += character.length;
  }
  return result;
}

const GAIJI: Record<string, string> = {
  髙: "［＃「高」の異体字］",
  﨑: "［＃「崎」の異体字］",
  "𠮷": "［＃「吉」の異体字］",
};
export function gaijiSuggestion(character: string): string | undefined {
  return GAIJI[character];
}
function stripBom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}
