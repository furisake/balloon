import { tokenize } from "./core/tokenizer";

export type AozoraSyntaxKind = "annotation" | "marker" | "ruby";

export interface AozoraSyntaxRange {
  from: number;
  to: number;
  kind: AozoraSyntaxKind;
}

export function aozoraSyntaxRanges(source: string): AozoraSyntaxRange[] {
  const ranges: AozoraSyntaxRange[] = [];
  for (const token of tokenize(source)) {
    if (token.type === "annotation" || token.type === "ruby") {
      ranges.push({
        from: token.sourceRange.from,
        to: token.sourceRange.to,
        kind: token.type,
      });
      continue;
    }
    if (token.type !== "text") continue;
    for (const match of token.value.matchAll(/[｜※]/g)) {
      const from = token.sourceRange.from + match.index;
      ranges.push({ from, to: from + 1, kind: "marker" });
    }
  }
  return ranges;
}
