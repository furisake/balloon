import { normalizeCatalogRow, parseCatalogCsv } from "@/lib/catalog/csv";

describe("catalog CSV", () => {
  const csv =
    "作品ID,作品名,姓,名,テキストファイルURL,テキストファイル最終更新日\n000001,短編,山田,太郎,https://www.aozora.gr.jp/cards/000001/files/1_ruby.zip,2026-01-01";
  test("parses and normalizes official columns", () =>
    expect(parseCatalogCsv(csv)).toEqual([
      {
        id: "000001:0",
        workId: "000001",
        title: "短編",
        author: "山田 太郎",
        fileId: "0",
        filename: "1_ruby.zip",
        format: "ZIP / TXT",
        encoding: "Shift_JIS",
        url: "https://www.aozora.gr.jp/cards/000001/files/1_ruby.zip",
      },
    ]));
  test("rejects non-official URL hosts", () =>
    expect(
      normalizeCatalogRow({
        作品ID: "1",
        作品名: "危険",
        姓: "",
        名: "",
        テキストファイルURL: "https://example.com/a.txt",
      }),
    ).toEqual([]));
});
