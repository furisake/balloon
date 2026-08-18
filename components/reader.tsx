"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Library, ListTree, Menu, Search, X } from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import type { BookFile } from "@/lib/catalog/types";
import { inlineText, parse } from "@/lib/core/parser";
import { searchText, type TextMatch } from "@/lib/search";
import { cacheBody, getCachedBody, getHistory, saveHistory, saveReadingPosition } from "@/lib/storage";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { DisplaySettingsButton, useDisplaySettings } from "./display-settings";
import { DocumentRenderer } from "./document-renderer";
import { ThemeSwitch } from "./theme-provider";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; book: BookFile; text: string };

export function Reader() {
  const params = useSearchParams(); const workId = params.get("workId") ?? ""; const fileId = params.get("fileId") ?? ""; const id = `${workId}:${fileId}`;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [settings, setSettings] = useDisplaySettings("reader");
  const [restoreOffset, setRestoreOffset] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false); const [keyword, setKeyword] = useState(""); const [matches, setMatches] = useState<TextMatch[]>([]); const [matchLimit, setMatchLimit] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null); const saveTimer = useRef<number | undefined>(undefined);
  const currentOffsetRef = useRef(0); const pendingDisplayOffsetRef = useRef<number | undefined>(undefined); const restoringDisplayRef = useRef(false);
  const load = useCallback(async () => { setState({ status: "loading" }); try { const cached = await getCachedBody(id); let book: BookFile; let text: string; if (cached) { const history = await getHistory(id); if (!history) throw new Error(); book = history.book; text = cached; } else { const response = await fetch(`/api/books/${encodeURIComponent(workId)}/${encodeURIComponent(fileId)}`); if (!response.ok) throw new Error(); const data = await response.json() as { book: BookFile; text: string }; book = data.book; text = data.text; try { await cacheBody(id, text, APP_CONFIG.bodyCacheLimit); } catch { /* Reader remains available */ } } await saveHistory(book, 0, APP_CONFIG.historyLimit); const history = await getHistory(id); const sourceOffset = history?.sourceOffset ?? 0; currentOffsetRef.current = sourceOffset; setRestoreOffset(sourceOffset); setState({ status: "ready", book, text }); } catch { setState({ status: "error", message: "本文を取得できませんでした" }); } }, [fileId, id, workId]);
  useEffect(() => { if (workId && fileId) void load(); else setState({ status: "error", message: "作品が指定されていません" }); }, [fileId, load, workId]);
  const parsed = useMemo(() => state.status === "ready" ? parse(state.text) : undefined, [state]);
  const headings = useMemo(() => parsed?.document.children.filter((block) => block.type === "heading") ?? [], [parsed]);
  const jumpTo = useCallback((offset: number, align: ScrollLogicalPosition = "start") => { const container = containerRef.current; const elements = container?.querySelectorAll<HTMLElement>("[data-source-from]"); const firstOffset = Number(elements?.[0]?.dataset.sourceFrom ?? 0); if (container && settings.writingMode === "vertical" && offset <= firstOffset) { container.scrollLeft = container.scrollWidth; return; } const target = [...(elements ?? [])].reverse().find((element) => Number(element.dataset.sourceFrom) <= offset); target?.scrollIntoView({ block: align, inline: align }); }, [settings.writingMode]);
  useLayoutEffect(() => {
    if (!parsed) return;
    const offset = pendingDisplayOffsetRef.current ?? restoreOffset;
    pendingDisplayOffsetRef.current = undefined;
    restoringDisplayRef.current = true;
    const frame = requestAnimationFrame(() => {
      jumpTo(offset);
      window.setTimeout(() => { restoringDisplayRef.current = false; }, 100);
    });
    return () => cancelAnimationFrame(frame);
  }, [jumpTo, parsed, restoreOffset]);
  function savePosition(offset: number) { if (restoringDisplayRef.current) return; currentOffsetRef.current = offset; window.clearTimeout(saveTimer.current); saveTimer.current = window.setTimeout(() => { void saveReadingPosition(id, offset); }, 300); }
  function changeDisplaySettings(next: typeof settings) { pendingDisplayOffsetRef.current = currentOffsetRef.current; restoringDisplayRef.current = true; setSettings(next); }
  function runTextSearch(event: FormEvent) { event.preventDefault(); if (state.status !== "ready") return; setMatches(searchText(state.text, keyword)); setMatchLimit(50); }
  function closeSearch() { setSearchOpen(false); setKeyword(""); setMatches([]); }
  if (state.status === "loading") return <main className="grid min-h-screen place-items-center"><p className="animate-pulse">読み込み中…</p></main>;
  if (state.status === "error") return <main className="grid min-h-screen place-items-center"><div className="grid justify-items-center gap-4"><p>{state.message}</p><Button onClick={() => void load()}>再試行</Button><Button asChild variant="ghost"><Link href="/shelf">本棚へ戻る</Link></Button></div></main>;
  return <main className="h-screen overflow-hidden"><div className="fixed left-3 top-3 z-30 flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 p-1 shadow"><Dialog><DialogTrigger asChild><Button size="icon" variant="ghost" aria-label="メイン操作"><Menu size={19} /></Button></DialogTrigger><DialogContent title="Reader操作" className="operation-panel"><div className="grid gap-3"><Button asChild variant="ghost"><Link href="/shelf"><Library size={18} />本棚へ戻る</Link></Button><Button variant="ghost" onClick={() => jumpTo(0)}><ArrowUp size={18} />先頭へ戻る</Button><DisplaySettingsButton settings={settings} onChange={changeDisplaySettings} /><ThemeSwitch /></div></DialogContent></Dialog>{headings.length > 0 && <Dialog><DialogTrigger asChild><Button size="icon" variant="ghost" aria-label="目次"><ListTree size={19} /></Button></DialogTrigger><DialogContent title="目次" className="operation-panel"><nav className="grid gap-1">{headings.map((heading) => <button key={heading.sourceRange.from} className="rounded px-2 py-2 text-left hover:bg-[var(--muted)]" style={{ paddingLeft: `${heading.level}rem` }} onClick={() => jumpTo(heading.sourceRange.from)}>{heading.children.map(inlineText).join("")}</button>)}</nav></DialogContent></Dialog>}<Button size="icon" variant="ghost" aria-label="本文内検索" onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}>{searchOpen ? <X size={19} /> : <Search size={19} />}</Button></div>{searchOpen && <aside className="fixed bottom-0 left-0 z-20 max-h-[70vh] w-full overflow-auto border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl md:bottom-auto md:top-0 md:h-full md:w-80 md:pt-20"><form className="flex gap-2" onSubmit={runTextSearch}><input autoFocus className="input min-w-0 flex-1" value={keyword} onChange={(event) => setKeyword(event.target.value)} aria-label="本文内検索" /><Button size="icon" aria-label="検索"><Search size={18} /></Button></form><div className="mt-4 grid gap-2">{matches.slice(0, matchLimit).map((match, index) => <button key={`${match.from}-${index}`} className="rounded border border-[var(--border)] p-3 text-left text-sm hover:bg-[var(--muted)]" onClick={() => jumpTo(match.from)}><strong>{match.matched}</strong><br /><span className="text-[var(--subtle)]">{match.snippet}</span></button>)}{matches.length > matchLimit && <Button variant="ghost" onClick={() => setMatchLimit((value) => value + 50)}>さらに表示</Button>}{keyword && matches.length === 0 && <p>見つかりませんでした</p>}</div></aside>}<div ref={containerRef} className={`h-full overflow-auto ${searchOpen ? "md:pl-80" : ""}`} onScroll={(event) => savePosition(nearestSourceOffset(event.currentTarget, settings.writingMode))}><DocumentRenderer document={parsed!.document} settings={settings} allowedImageHosts={APP_CONFIG.allowedImageHosts} highlights={matches} onVisibleOffset={savePosition} /></div></main>;
}

function nearestSourceOffset(container: HTMLElement, writingMode: "horizontal" | "vertical"): number { const bounds = container.getBoundingClientRect(); let offset = 0; let distance = Infinity; container.querySelectorAll<HTMLElement>("[data-source-from]").forEach((element) => { const rect = element.getBoundingClientRect(); const next = writingMode === "vertical" ? Math.abs(bounds.right - rect.right) : Math.abs(bounds.top - rect.top); if (next < distance) { distance = next; offset = Number(element.dataset.sourceFrom); } }); return offset; }
