"use client";

import { Fragment } from "react";
import type { BlockNode, DocumentNode, InlineNode } from "@/lib/core/types";
import { cn } from "@/lib/utils";
import type { DisplaySettings } from "./display-settings";

export function DocumentRenderer({
  document,
  settings,
  highlights = [],
  allowedImageHosts,
  onVisibleOffset,
}: {
  document: DocumentNode;
  settings: DisplaySettings;
  highlights?: Array<{ from: number; to: number }>;
  allowedImageHosts: readonly string[];
  onVisibleOffset?: (offset: number) => void;
}) {
  const fontSizes = ["text-base", "text-lg", "text-xl", "text-2xl"];
  const vertical = settings.writingMode === "vertical";
  return (
    <article
      className={cn(
        "reader-paper serif leading-[2]",
        fontSizes[settings.fontSize - 1],
        vertical
          ? "vertical-doc max-h-[calc(100vh-5rem)] overflow-x-auto"
          : "mx-auto max-w-[72ch]",
      )}
      style={
        settings.characters === "auto"
          ? undefined
          : vertical
            ? { height: `${settings.characters}em` }
            : { maxWidth: `${settings.characters}em` }
      }
      onScroll={(event) => {
        const elements =
          event.currentTarget.querySelectorAll<HTMLElement>(
            "[data-source-from]",
          );
        const bounds = event.currentTarget.getBoundingClientRect();
        let closest = elements[0];
        let distance = Infinity;
        elements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          const value = vertical
            ? Math.abs(bounds.right - rect.right)
            : Math.abs(bounds.top - rect.top);
          if (value < distance) {
            distance = value;
            closest = element;
          }
        });
        if (closest) onVisibleOffset?.(Number(closest.dataset.sourceFrom));
      }}
    >
      {document.children.map((block, index) => (
        <Block
          key={`${block.sourceRange.from}-${index}`}
          block={block}
          highlights={highlights}
          allowedImageHosts={allowedImageHosts}
        />
      ))}
    </article>
  );
}

function Block({
  block,
  highlights,
  allowedImageHosts,
}: {
  block: BlockNode;
  highlights: Array<{ from: number; to: number }>;
  allowedImageHosts: readonly string[];
}) {
  if (block.type === "pageBreak")
    return (
      <hr
        data-source-from={block.sourceRange.from}
        className="my-8 border-[var(--border)]"
      />
    );
  const children = block.children.map((node, index) => (
    <Inline
      key={`${node.sourceRange.from}-${index}`}
      node={node}
      highlights={highlights}
      allowedImageHosts={allowedImageHosts}
    />
  ));
  const props = {
    "data-source-from": block.sourceRange.from,
    "data-source-to": block.sourceRange.to,
    className: "mb-[1em]",
    style: block.indent
      ? { marginInlineStart: `${block.indent}em` }
      : undefined,
  };
  if (block.type === "heading") {
    const Tag = `h${block.level + 1}` as "h2" | "h3" | "h4";
    return (
      <Tag {...props} className={`${props.className} font-bold`}>
        {children}
      </Tag>
    );
  }
  return <p {...props}>{children}</p>;
}

function Inline({
  node,
  highlights,
  allowedImageHosts,
}: {
  node: InlineNode;
  highlights: Array<{ from: number; to: number }>;
  allowedImageHosts: readonly string[];
}) {
  const highlighted = highlights.some(
    (range) =>
      range.from < node.sourceRange.to && range.to > node.sourceRange.from,
  );
  if (node.type === "ruby")
    return (
      <ruby className={highlighted ? "search-highlight" : undefined}>
        {node.base}
        <rt>{node.reading}</rt>
      </ruby>
    );
  if (node.type === "emphasis")
    return (
      <em className={highlighted ? "search-highlight" : undefined}>
        {node.children.map((child, index) => (
          <Inline
            key={index}
            node={child}
            highlights={highlights}
            allowedImageHosts={allowedImageHosts}
          />
        ))}
      </em>
    );
  if (node.type === "text")
    return (
      <span className={highlighted ? "search-highlight" : undefined}>
        {node.value}
      </span>
    );
  if (node.type === "image") {
    const url = safeImageUrl(node.src, allowedImageHosts);
    if (!url)
      return (
        <span className="text-sm text-[var(--subtle)]">
          {node.alt || "画像の取得に失敗しました"}
        </span>
      );
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={node.alt}
        width={node.width}
        height={node.height}
        className="my-4 h-auto max-w-full"
        onError={(event) => {
          event.currentTarget.replaceWith(
            document.createTextNode(node.alt || "画像の取得に失敗しました"),
          );
        }}
      />
    );
  }
  return <Fragment />;
}

function safeImageUrl(
  value: string,
  hosts: readonly string[],
): string | undefined {
  try {
    const url = new URL(value, "https://www.aozora.gr.jp/");
    return url.protocol === "https:" && hosts.includes(url.hostname)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
