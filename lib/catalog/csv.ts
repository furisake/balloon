import Papa from "papaparse";
import type { BookFile } from "./types";

const COLUMNS = {
  workId: "作品ID",
  title: "作品名",
  authorLast: "姓",
  authorFirst: "名",
  textUrl: "テキストファイルURL",
  textLastUpdated: "テキストファイル最終更新日",
} as const;

type CsvRow = Record<string, string | undefined>;

export function parseCatalogCsv(csv: string): BookFile[] {
  const parsed = Papa.parse<CsvRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length && !parsed.data.length)
    throw new Error("作品一覧CSVを解析できませんでした");
  return parsed.data.flatMap(normalizeCatalogRow);
}

export function normalizeCatalogRow(row: CsvRow): BookFile[] {
  const workId = clean(row[COLUMNS.workId]);
  const title = clean(row[COLUMNS.title]);
  const author = [
    clean(row[COLUMNS.authorLast]),
    clean(row[COLUMNS.authorFirst]),
  ]
    .filter(Boolean)
    .join(" ");
  const urls = clean(row[COLUMNS.textUrl])
    .split(/\s*[|、]\s*/)
    .filter((url) => /^https:\/\/www\.aozora\.gr\.jp\//.test(url));
  if (!workId || !title || !urls.length) return [];
  return urls.map((url, index) => {
    const filename = decodeURIComponent(
      url.split("/").at(-1) ?? `text-${index + 1}`,
    );
    const zip = filename.toLowerCase().endsWith(".zip");
    const encoding = /utf-?8/i.test(filename) ? "UTF-8" : "Shift_JIS";
    return {
      id: `${workId}:${index}`,
      workId,
      title,
      author,
      fileId: String(index),
      filename,
      format: zip ? "ZIP / TXT" : "TXT",
      encoding,
      url,
    };
  });
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}
