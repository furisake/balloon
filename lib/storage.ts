import { openDB, type DBSchema } from "idb";
import type { BookFile } from "./catalog/types";

export interface HistoryEntry {
  id: string;
  book: BookFile;
  lastReadAt: number;
  sourceOffset: number;
}
export interface CachedBody {
  id: string;
  text: string;
  lastUsedAt: number;
}
export interface Draft {
  id: "current";
  name: string;
  text: string;
  anchor: number;
  head: number;
  scrollOffset: number;
  updatedAt: number;
}

interface BalloonDb extends DBSchema {
  history: { key: string; value: HistoryEntry; indexes: { "by-date": number } };
  bodies: { key: string; value: CachedBody; indexes: { "by-used": number } };
  drafts: { key: string; value: Draft };
}

const DB_NAME = "balloon";
async function db() {
  return openDB<BalloonDb>(DB_NAME, 1, {
    upgrade(database) {
      const history = database.createObjectStore("history", { keyPath: "id" });
      history.createIndex("by-date", "lastReadAt");
      const bodies = database.createObjectStore("bodies", { keyPath: "id" });
      bodies.createIndex("by-used", "lastUsedAt");
      database.createObjectStore("drafts", { keyPath: "id" });
    },
  });
}

export async function listHistory(): Promise<HistoryEntry[]> {
  return (await (await db()).getAll("history")).sort(
    (a, b) => b.lastReadAt - a.lastReadAt,
  );
}
export async function getHistory(id: string) {
  return (await db()).get("history", id);
}
export async function saveHistory(
  book: BookFile,
  sourceOffset = 0,
  limit = 1000,
) {
  const database = await db();
  const current = await database.get("history", book.id);
  await database.put("history", {
    id: book.id,
    book,
    lastReadAt: Date.now(),
    sourceOffset: current?.sourceOffset ?? sourceOffset,
  });
  const entries = await database.getAllFromIndex("history", "by-date");
  for (const item of entries.slice(0, Math.max(0, entries.length - limit)))
    await database.delete("history", item.id);
}
export async function saveReadingPosition(id: string, sourceOffset: number) {
  const database = await db();
  const entry = await database.get("history", id);
  if (entry)
    await database.put("history", {
      ...entry,
      sourceOffset,
      lastReadAt: Date.now(),
    });
}
export async function deleteHistory(id: string) {
  const database = await db();
  const tx = database.transaction(["history", "bodies"], "readwrite");
  await Promise.all([
    tx.objectStore("history").delete(id),
    tx.objectStore("bodies").delete(id),
    tx.done,
  ]);
}
export async function clearReadingData() {
  const database = await db();
  const tx = database.transaction(["history", "bodies"], "readwrite");
  await Promise.all([
    tx.objectStore("history").clear(),
    tx.objectStore("bodies").clear(),
    tx.done,
  ]);
}
export async function getCachedBody(id: string) {
  const database = await db();
  const body = await database.get("bodies", id);
  if (body) await database.put("bodies", { ...body, lastUsedAt: Date.now() });
  return body?.text;
}
export async function cacheBody(id: string, text: string, limit = 10) {
  const database = await db();
  await database.put("bodies", { id, text, lastUsedAt: Date.now() });
  const entries = await database.getAllFromIndex("bodies", "by-used");
  for (const item of entries.slice(0, Math.max(0, entries.length - limit)))
    await database.delete("bodies", item.id);
}
export async function loadDraft() {
  return (await db()).get("drafts", "current");
}
export async function saveDraft(draft: Omit<Draft, "id" | "updatedAt">) {
  await (
    await db()
  ).put("drafts", { ...draft, id: "current", updatedAt: Date.now() });
}
