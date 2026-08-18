import { tokenize } from "./tokenizer";
import type {
  BlockNode,
  Diagnostic,
  DocumentNode,
  InlineNode,
  ParseResult,
  Token,
} from "./types";

const HEADING = /^(?:(?:「([^」]+)」は)?(大|中|小)見出し)$/;
const INDENT = /^([０-９0-9]+)字下げ$/;
const IMAGE = /^挿絵（(.+?)(?:、横(\d+)×縦(\d+))?）入る$/;

export function parse(source: string): ParseResult {
  const blocks: BlockNode[] = [];
  const diagnostics: Diagnostic[] = [];
  let start = 0;
  for (const part of source.split(/\r\n|\r|\n/)) {
    const lineEnd = start + part.length;
    if (part.length) blocks.push(parseBlock(part, start, diagnostics));
    start = lineEnd + (source.slice(lineEnd, lineEnd + 2) === "\r\n" ? 2 : 1);
  }
  const document: DocumentNode = {
    type: "document",
    children: blocks,
    sourceRange: { from: 0, to: source.length },
  };
  return { document, diagnostics };
}

export function parseBlock(
  source: string,
  offset: number,
  diagnostics: Diagnostic[],
): BlockNode {
  const tokens = tokenize(source, offset);
  const last = tokens.at(-1);
  if (last?.type === "annotation" && last.value === "［＃改ページ］") {
    return {
      type: "pageBreak",
      sourceRange: { from: offset, to: offset + source.length },
    };
  }
  let level: 1 | 2 | 3 | undefined;
  let headingTarget: string | undefined;
  if (last?.type === "annotation") {
    const value = last.value.slice(2, -1);
    const match = value.match(HEADING);
    if (match) {
      headingTarget = match[1];
      level = match[2] === "大" ? 1 : match[2] === "中" ? 2 : 3;
    }
  }
  const withoutHeading = level ? tokens.slice(0, -1) : tokens;
  const first = withoutHeading[0];
  const indentMatch =
    first?.type === "annotation"
      ? first.value.slice(2, -1).match(INDENT)
      : undefined;
  const indent = indentMatch ? parseFullWidthNumber(indentMatch[1]) : undefined;
  const content = indentMatch ? withoutHeading.slice(1) : withoutHeading;
  const children = parseInline(content, diagnostics);
  const sourceRange = { from: offset, to: offset + source.length };
  if (
    level &&
    headingTarget !== undefined &&
    children.map(inlineText).join("") !== headingTarget
  ) {
    diagnostics.push({
      from: last?.sourceRange.from ?? offset,
      to: last?.sourceRange.to ?? offset + source.length,
      severity: "error",
      message: "見出し注記の対象文字列が本文と一致しません",
    });
  }
  return level
    ? { type: "heading", level, children, indent, sourceRange }
    : { type: "paragraph", children, indent, sourceRange };
}

function parseInline(tokens: Token[], diagnostics: Diagnostic[]): InlineNode[] {
  const nodes: InlineNode[] = [];
  for (const token of tokens) {
    if (token.type === "text") {
      nodes.push({
        type: "text",
        value: token.value,
        sourceRange: token.sourceRange,
      });
      continue;
    }
    if (token.type === "ruby") {
      const previous = nodes.at(-1);
      if (!previous || previous.type !== "text") {
        diagnostics.push({
          from: token.sourceRange.from,
          to: token.sourceRange.to,
          severity: "error",
          message: "ルビの親文字がありません",
        });
        nodes.push({
          type: "text",
          value: token.value,
          sourceRange: token.sourceRange,
        });
        continue;
      }
      const explicit = previous.value.lastIndexOf("｜");
      const auto = previous.value.match(/[一-龠々〆ヵヶ]+$/)?.[0] ?? "";
      const base = explicit >= 0 ? previous.value.slice(explicit + 1) : auto;
      if (!base) {
        diagnostics.push({
          from: token.sourceRange.from,
          to: token.sourceRange.to,
          severity: "error",
          message: "ルビの親文字を判定できません",
        });
        nodes.push({
          type: "text",
          value: token.value,
          sourceRange: token.sourceRange,
        });
        continue;
      }
      previous.value = previous.value
        .slice(0, previous.value.length - base.length)
        .replace(/｜$/, "");
      if (!previous.value) nodes.pop();
      nodes.push({
        type: "ruby",
        base,
        reading: token.value.slice(1, -1),
        sourceRange: {
          from: token.sourceRange.from - base.length,
          to: token.sourceRange.to,
        },
      });
      continue;
    }
    if (token.type !== "annotation") continue;
    const value = token.value.slice(2, -1);
    if (value.startsWith("ここから傍点") || value === "傍点") {
      nodes.push({ type: "note", value, sourceRange: token.sourceRange });
    } else if (value.startsWith("外字")) {
      nodes.push({
        type: "gaiji",
        description: value,
        sourceRange: token.sourceRange,
      });
    } else {
      const image = value.match(IMAGE);
      if (image)
        nodes.push({
          type: "image",
          src: image[1],
          alt: "挿絵",
          width: toNumber(image[2]),
          height: toNumber(image[3]),
          sourceRange: token.sourceRange,
        });
      else nodes.push({ type: "note", value, sourceRange: token.sourceRange });
    }
  }
  return nodes;
}

function toNumber(value: string | undefined) {
  return value ? Number(value) : undefined;
}
function parseFullWidthNumber(value: string): number {
  return Number(
    value.replace(/[０-９]/g, (character) =>
      String(character.charCodeAt(0) - 0xff10),
    ),
  );
}

export function visibleText(node: DocumentNode): string {
  return node.children
    .flatMap((block) =>
      "children" in block ? block.children.map(inlineText).join("") : "",
    )
    .join("\n");
}

export function inlineText(node: InlineNode): string {
  if (node.type === "text") return node.value;
  if (node.type === "ruby") return node.base;
  if (node.type === "emphasis") return node.children.map(inlineText).join("");
  return "";
}
