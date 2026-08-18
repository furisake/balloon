import Fuse from "fuse.js";
import type { BookFile } from "./catalog/types";

export function searchBooks(books: BookFile[], query: string): BookFile[] {
  const term = query.trim();
  if (!term) return [];
  return new Fuse(books, { keys: [{ name: "title", weight: 0.65 }, { name: "author", weight: 0.35 }], threshold: 0.4, ignoreLocation: true }).search(term).map((item) => item.item);
}

export interface TextMatch { from: number; to: number; matched: string; snippet: string }

export function searchText(source: string, query: string): TextMatch[] {
  const term = query.trim();
  if (!term) return [];
  const normalizedSource = source.normalize("NFKC").toLocaleLowerCase("ja");
  const normalizedTerm = term.normalize("NFKC").toLocaleLowerCase("ja");
  const matches: TextMatch[] = [];
  let from = 0;
  while ((from = normalizedSource.indexOf(normalizedTerm, from)) >= 0) {
    matches.push({ from, to: from + term.length, matched: source.slice(from, from + term.length), snippet: source.slice(Math.max(0, from - 16), Math.min(source.length, from + term.length + 32)).replace(/\s+/g, " ") });
    from += Math.max(1, normalizedTerm.length);
  }
  return matches;
}
