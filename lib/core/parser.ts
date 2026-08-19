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
const END_INDENT = /^地から([０-９0-9]+)字上げ$/;
const IMAGE =
  /^(.+?)（([^、）]+\.(?:gif|jpe?g|png))(?:、横(\d+)×縦(\d+))?）入る$/i;
const PAGE_BREAK = /^(?:改丁|改ページ|改見開き|改段)$/;
const EMPHASIS =
  /^「(.+)」に(?:白ゴマ|丸|白丸|黒三角|白三角|二重丸|蛇の目|ばつ)?傍点$/;
const EMPHASIS_START =
  /^(?:ここから)?(?:左に)?(?:白ゴマ|丸|白丸|黒三角|白三角|二重丸|蛇の目|ばつ)?傍点$/;
const EMPHASIS_END =
  /^(?:ここで)?(?:左に)?(?:白ゴマ|丸|白丸|黒三角|白三角|二重丸|蛇の目|ばつ)?傍点終わり$/;

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
  if (
    tokens.length === 1 &&
    last?.type === "annotation" &&
    PAGE_BREAK.test(last.value.slice(2, -1))
  ) {
    return {
      type: "pageBreak",
      sourceRange: { from: offset, to: offset + source.length },
    };
  }
  const headingStart =
    tokens[0]?.type === "annotation"
      ? tokens[0].value.slice(2, -1).match(/^(大|中|小)見出し$/)
      : undefined;
  const headingEnd =
    last?.type === "annotation"
      ? last.value.slice(2, -1).match(/^(大|中|小)見出し終わり$/)
      : undefined;
  if (headingStart && headingEnd && headingStart[1] === headingEnd[1]) {
    const level =
      headingStart[1] === "大" ? 1 : headingStart[1] === "中" ? 2 : 3;
    return {
      type: "heading",
      level,
      children: parseInline(tokens.slice(1, -1), diagnostics),
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
  const endIndentMatch =
    first?.type === "annotation"
      ? first.value.slice(2, -1).match(END_INDENT)
      : undefined;
  const indent = indentMatch ? parseFullWidthNumber(indentMatch[1]) : undefined;
  const endIndent = endIndentMatch
    ? parseFullWidthNumber(endIndentMatch[1])
    : undefined;
  const content =
    indentMatch || endIndentMatch ? withoutHeading.slice(1) : withoutHeading;
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
    ? { type: "heading", level, children, indent, endIndent, sourceRange }
    : { type: "paragraph", children, indent, endIndent, sourceRange };
}

function parseInline(tokens: Token[], diagnostics: Diagnostic[]): InlineNode[] {
  const nodes: InlineNode[] = [];
  let emphasis:
    | { children: InlineNode[]; sourceRange: { from: number; to: number } }
    | undefined;
  for (const token of tokens) {
    const current = emphasis?.children ?? nodes;
    if (token.type === "text") {
      current.push({
        type: "text",
        value: token.value,
        sourceRange: token.sourceRange,
      });
      continue;
    }
    if (token.type === "ruby") {
      const previous = current.at(-1);
      if (!previous || previous.type !== "text") {
        diagnostics.push({
          from: token.sourceRange.from,
          to: token.sourceRange.to,
          severity: "error",
          message: "ルビの親文字がありません",
        });
        current.push({
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
        current.push({
          type: "text",
          value: token.value,
          sourceRange: token.sourceRange,
        });
        continue;
      }
      previous.value = previous.value
        .slice(0, previous.value.length - base.length)
        .replace(/｜$/, "");
      if (!previous.value) current.pop();
      current.push({
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
    if (EMPHASIS_START.test(value) && !emphasis) {
      emphasis = { children: [], sourceRange: { ...token.sourceRange } };
    } else if (EMPHASIS_END.test(value) && emphasis) {
      emphasis.sourceRange.to = token.sourceRange.to;
      nodes.push({ type: "emphasis", ...emphasis });
      emphasis = undefined;
    } else {
      const emphasisMatch = value.match(EMPHASIS);
      if (emphasisMatch) {
        if (!wrapTrailingEmphasis(current, emphasisMatch[1], token)) {
          diagnostics.push({
            from: token.sourceRange.from,
            to: token.sourceRange.to,
            severity: "error",
            message: "傍点注記の対象文字列が本文と一致しません",
          });
        }
      } else if (
        value.startsWith("外字") ||
        /面区点番号|\d+-\d+-\d+/.test(value)
      ) {
        current.push({
          type: "gaiji",
          description: value,
          sourceRange: token.sourceRange,
        });
      } else {
        const image = value.match(IMAGE);
        if (image)
          current.push({
            type: "image",
            src: image[2],
            alt: imageAlt(image[1]),
            width: toNumber(image[3]),
            height: toNumber(image[4]),
            sourceRange: token.sourceRange,
          });
        else
          current.push({ type: "note", value, sourceRange: token.sourceRange });
      }
    }
  }
  if (emphasis) {
    diagnostics.push({
      from: emphasis.sourceRange.from,
      to: emphasis.sourceRange.to,
      severity: "error",
      message: "傍点注記が閉じられていません",
    });
    nodes.push(...emphasis.children);
  }
  return nodes;
}

function wrapTrailingEmphasis(
  nodes: InlineNode[],
  target: string,
  annotation: Token,
): boolean {
  if (!nodes.map(inlineText).join("").endsWith(target)) return false;
  const children: InlineNode[] = [];
  let remaining = target.length;
  while (remaining > 0) {
    const node = nodes.pop();
    if (!node) return false;
    const value = inlineText(node);
    if (value.length <= remaining) {
      children.unshift(node);
      remaining -= value.length;
      continue;
    }
    if (node.type !== "text") {
      nodes.push(node, ...children);
      return false;
    }
    const split = node.value.length - remaining;
    nodes.push({
      ...node,
      value: node.value.slice(0, split),
      sourceRange: { ...node.sourceRange, to: node.sourceRange.from + split },
    });
    children.unshift({
      ...node,
      value: node.value.slice(split),
      sourceRange: { ...node.sourceRange, from: node.sourceRange.from + split },
    });
    remaining = 0;
  }
  nodes.push({
    type: "emphasis",
    children,
    sourceRange: {
      from: children[0].sourceRange.from,
      to: annotation.sourceRange.to,
    },
  });
  return true;
}

function imageAlt(value: string): string {
  return value.match(/^「(.+)」のキャプション付き/)?.[1] ?? value;
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
