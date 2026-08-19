export interface SourceRange {
  from: number;
  to: number;
}

interface NodeBase {
  sourceRange: SourceRange;
}

export type InlineNode =
  | (NodeBase & { type: "text"; value: string })
  | (NodeBase & { type: "ruby"; base: string; reading: string })
  | (NodeBase & { type: "emphasis"; children: InlineNode[] })
  | (NodeBase & { type: "note"; value: string })
  | (NodeBase & { type: "gaiji"; description: string })
  | (NodeBase & {
      type: "image";
      src: string;
      alt: string;
      width?: number;
      height?: number;
    });

interface BlockLayout {
  indent?: number;
  endIndent?: number;
}

export type BlockNode =
  | (NodeBase & BlockLayout & { type: "paragraph"; children: InlineNode[] })
  | (NodeBase & {
      type: "heading";
      level: 1 | 2 | 3;
      children: InlineNode[];
    } & BlockLayout)
  | (NodeBase & { type: "pageBreak" });

export interface DocumentNode extends NodeBase {
  type: "document";
  children: BlockNode[];
}

export interface Diagnostic {
  from: number;
  to: number;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

export interface ParseResult {
  document: DocumentNode;
  diagnostics: Diagnostic[];
}

export interface Token {
  type: "text" | "ruby" | "annotation" | "newline";
  value: string;
  sourceRange: SourceRange;
}
