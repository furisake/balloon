import { parse } from "./parser";
import type { BlockNode, ParseResult } from "./types";

export interface IncrementalResult extends ParseResult { reparsedRanges: Array<{ from: number; to: number }>; reusedBlocks: number }

export function parseIncremental(previousSource: string, nextSource: string, previous: ParseResult): IncrementalResult {
  if (previousSource === nextSource) return { ...previous, reparsedRanges: [], reusedBlocks: previous.document.children.length };
  const result = parse(nextSource);
  const oldLines = previousSource.split(/\r\n|\r|\n/);
  const newLines = nextSource.split(/\r\n|\r|\n/);
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) prefix++;
  let suffix = 0;
  while (suffix < oldLines.length - prefix && suffix < newLines.length - prefix && oldLines.at(-1 - suffix) === newLines.at(-1 - suffix)) suffix++;
  let reusedBlocks = 0;
  result.document.children = result.document.children.map((block, index): BlockNode => {
    const unchangedPrefix = index < prefix;
    const unchangedSuffix = index >= newLines.length - suffix;
    const oldIndex = unchangedPrefix ? index : unchangedSuffix ? oldLines.length - (newLines.length - index) : -1;
    const old = oldIndex >= 0 ? previous.document.children[oldIndex] : undefined;
    if (old) { reusedBlocks++; const delta = block.sourceRange.from - old.sourceRange.from; return delta === 0 ? old : shiftBlock(old, delta); }
    return block;
  });
  const from = newLines.slice(0, prefix).reduce((sum, line) => sum + line.length + 1, 0);
  const changed = newLines.slice(prefix, Math.max(prefix + 1, newLines.length - suffix)).join("\n");
  return { ...result, reparsedRanges: [{ from, to: from + changed.length }], reusedBlocks };
}

function shiftBlock(block: BlockNode, delta: number): BlockNode {
  const sourceRange = { from: block.sourceRange.from + delta, to: block.sourceRange.to + delta };
  if (!("children" in block)) return { ...block, sourceRange };
  return { ...block, sourceRange, children: block.children.map((node) => ({ ...node, sourceRange: { from: node.sourceRange.from + delta, to: node.sourceRange.to + delta } })) };
}
