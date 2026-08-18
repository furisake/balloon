import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/config/app";
import { getCatalog } from "@/lib/catalog/server";
import { logger } from "@/lib/logger";
import { searchBooks } from "@/lib/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  if (!query) return NextResponse.json({ items: [], hasMore: false });
  try {
    const results = searchBooks(await getCatalog(), query);
    return NextResponse.json({
      items: results.slice(offset, offset + APP_CONFIG.searchPageSize),
      hasMore: offset + APP_CONFIG.searchPageSize < results.length,
    });
  } catch (error) {
    logger.error({ error }, "Catalog search failed");
    return NextResponse.json(
      { message: "作品一覧を取得できませんでした" },
      { status: 502 },
    );
  }
}
