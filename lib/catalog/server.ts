import { unstable_cache } from "next/cache";
import JSZip from "jszip";
import { APP_CONFIG } from "@/config/app";
import { decodeText } from "@/lib/encoding";
import { parseCatalogCsv } from "./csv";
import type { BookFile } from "./types";

const loadCatalog = unstable_cache(
  async (): Promise<BookFile[]> => {
    const response = await fetch(APP_CONFIG.catalogUrl);
    if (!response.ok)
      throw new Error(`Catalog fetch failed: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const zip = await JSZip.loadAsync(bytes);
    const entry = Object.values(zip.files).find(
      (file) => !file.dir && file.name.endsWith(".csv"),
    );
    if (!entry) throw new Error("Catalog CSV not found");
    return parseCatalogCsv(await entry.async("string"));
  },
  ["aozora-catalog"],
  { revalidate: APP_CONFIG.cacheTtlSeconds },
);

export async function getCatalog(): Promise<BookFile[]> {
  return loadCatalog();
}

export async function resolveBook(
  workId: string,
  fileId: string,
): Promise<BookFile | undefined> {
  return (await getCatalog()).find(
    (book) => book.workId === workId && book.fileId === fileId,
  );
}

export const fetchBookText = unstable_cache(
  async (
    workId: string,
    fileId: string,
  ): Promise<{ book: BookFile; text: string }> => {
    const book = await resolveBook(workId, fileId);
    if (!book) throw new Error("Book not found");
    const response = await fetch(book.url);
    if (!response.ok) throw new Error(`Text fetch failed: ${response.status}`);
    let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(
      await response.arrayBuffer(),
    );
    if (book.url.toLowerCase().endsWith(".zip")) {
      const zip = await JSZip.loadAsync(bytes);
      const entry = Object.values(zip.files).find(
        (file) => !file.dir && file.name.toLowerCase().endsWith(".txt"),
      );
      if (!entry) throw new Error("ZIP内に本文がありません");
      bytes = await entry.async("uint8array");
    }
    return { book, text: decodeText(bytes).text };
  },
  ["aozora-book"],
  { revalidate: APP_CONFIG.cacheTtlSeconds },
);
