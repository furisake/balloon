import { tokenize } from "./core/tokenizer";

export type AozoraSyntaxKind =
  | "emphasis"
  | "gaiji"
  | "heading"
  | "image"
  | "layout"
  | "marker"
  | "note"
  | "ruby";

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
        kind:
          token.type === "ruby"
            ? "ruby"
            : classifyAnnotation(
                token.value.slice(2, -1),
                source[token.sourceRange.from - 1] === "※",
              ),
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

function classifyAnnotation(
  value: string,
  followsGaijiMarker: boolean,
): AozoraSyntaxKind {
  if (
    followsGaijiMarker ||
    /外字|面区点番号|第[一二]水準|U\+[0-9A-F]+|\d+-\d+-\d+/i.test(value)
  )
    return "gaiji";
  if (/キャプション|(?:図|地図|絵|挿絵|表|写真).*入る/.test(value))
    return "image";
  if (/(?:同行|窓)?[大中小]見出し|目次/.test(value)) return "heading";
  if (
    /傍点|傍線|二重傍線|鎖線|破線|波線|太字|ゴシック|斜体|イタリック|罫囲み/.test(
      value,
    )
  )
    return "emphasis";
  if (
    /改丁|改ページ|改見開き|改段|字下げ|字上げ|地付き|地寄せ|天付き|左右中央|字詰め|横組み/.test(
      value,
    )
  )
    return "layout";
  return "note";
}
