import type { Diagnostic } from "./types";
import { findUnencodableCharacters, gaijiSuggestion } from "../encoding";

export function lint(source: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  addMatches(
    source,
    /[ \t]+$/gm,
    "行末に不要な空白があります",
    "warning",
    diagnostics,
  );
  addMatches(
    source,
    /\.{3,}|(?<!…)…(?!…)/g,
    "三点リーダーは「……」を推奨します",
    "info",
    diagnostics,
  );
  addMatches(
    source,
    /(?<!―)―(?!―)/g,
    "ダッシュは二つ続けて使用します",
    "info",
    diagnostics,
  );
  addMatches(
    source,
    /［＃(?![^］]*］)/g,
    "注記が閉じられていません",
    "error",
    diagnostics,
  );
  for (const item of findUnencodableCharacters(source)) {
    diagnostics.push({
      from: item.index,
      to: item.index + item.character.length,
      severity: "error",
      message: `Shift_JISへ変換できない文字です: ${item.character}`,
      suggestion: gaijiSuggestion(item.character),
    });
  }
  return diagnostics;
}

function addMatches(
  source: string,
  pattern: RegExp,
  message: string,
  severity: Diagnostic["severity"],
  output: Diagnostic[],
) {
  for (const match of source.matchAll(pattern))
    output.push({
      from: match.index,
      to: match.index + match[0].length,
      severity,
      message,
    });
}
