import type { Token } from "./types";

export function tokenize(source: string, baseOffset = 0): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  const pattern = /《[^》\r\n]*》|［＃[^］\r\n]*］|\r\n|\r|\n/g;
  for (const match of source.matchAll(pattern)) {
    const index = match.index;
    if (index > cursor)
      pushText(tokens, source.slice(cursor, index), cursor + baseOffset);
    const value = match[0];
    const type = value.startsWith("《")
      ? "ruby"
      : value.startsWith("［＃")
        ? "annotation"
        : "newline";
    tokens.push({
      type,
      value,
      sourceRange: {
        from: index + baseOffset,
        to: index + value.length + baseOffset,
      },
    });
    cursor = index + value.length;
  }
  if (cursor < source.length)
    pushText(tokens, source.slice(cursor), cursor + baseOffset);
  return tokens;
}

function pushText(tokens: Token[], value: string, from: number) {
  tokens.push({
    type: "text",
    value,
    sourceRange: { from, to: from + value.length },
  });
}
