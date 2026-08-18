import { NextResponse } from "next/server";
import { fetchBookText } from "@/lib/catalog/server";
import { logger } from "@/lib/logger";

export async function GET(_request: Request, context: { params: Promise<{ workId: string; fileId: string }> }) {
  const { workId, fileId } = await context.params;
  if (!/^\d+$/.test(workId) || !/^\d+$/.test(fileId)) return NextResponse.json({ message: "作品を指定してください" }, { status: 400 });
  try { return NextResponse.json(await fetchBookText(workId, fileId)); }
  catch (error) { logger.error({ error, workId, fileId }, "Book fetch failed"); return NextResponse.json({ message: "本文を取得できませんでした" }, { status: 502 }); }
}
