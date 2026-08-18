"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Home, Search, Trash2 } from "lucide-react";
import type { BookFile } from "@/lib/catalog/types";
import { APP_CONFIG } from "@/config/app";
import { clearReadingData, deleteHistory, listHistory, type HistoryEntry } from "@/lib/storage";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./ui/dialog";
import { ThemeSwitch } from "./theme-provider";

export function Shelf() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLimit, setHistoryLimit] = useState<number>(APP_CONFIG.searchPageSize);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookFile[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => { void listHistory().then(setHistory); }, []);
  const runSearch = useCallback(async (term: string, reset: boolean) => { if (!term) { setResults([]); setQuery(""); setError(undefined); return; } setLoading(true); setError(undefined); try { const offset = reset ? 0 : results.length; const response = await fetch(`/api/search?q=${encodeURIComponent(term)}&offset=${offset}`); if (!response.ok) throw new Error(); const data = await response.json() as { items: BookFile[]; hasMore: boolean }; setResults((current) => reset ? data.items : [...current, ...data.items]); setHasMore(data.hasMore); setQuery(term); } catch { setError("作品一覧を取得できませんでした"); setQuery(term); } finally { setLoading(false); } }, [results.length]);
  useEffect(() => { const target = sentinel.current; if (!target) return; const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting || loading) return; if (query && hasMore) void runSearch(query, false); else if (!query && historyLimit < history.length) setHistoryLimit((value) => value + APP_CONFIG.searchPageSize); }); observer.observe(target); return () => observer.disconnect(); }, [hasMore, history.length, historyLimit, loading, query, runSearch]);
  function submit(event: FormEvent) { event.preventDefault(); const term = input.trim(); void runSearch(term, true); }
  async function remove(id: string) { await deleteHistory(id); setHistory((items) => items.filter((item) => item.id !== id)); }
  async function clearAll() { await clearReadingData(); setHistory([]); }
  const shown = query ? results : history.slice(0, historyLimit).map((item) => item.book);
  return <main className="min-h-screen"><header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]"><div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2"><Button asChild variant="ghost" size="icon"><Link href="/" aria-label="ホームへ戻る"><Home size={19} /></Link></Button><form className="flex min-w-0 flex-1 gap-2" onSubmit={submit}><input className="input min-w-0 flex-1" placeholder="作品名・著者名で検索" aria-label="作品名・著者名で検索" value={input} onChange={(event) => { setInput(event.target.value); if (!event.target.value) void runSearch("", true); }} /><Button type="submit"><Search size={18} /><span className="hidden sm:inline">検索</span></Button></form><ThemeSwitch /></div></header><div className="mx-auto max-w-6xl px-4 py-8">{!query && history.length > 0 && <div className="mb-5"><Dialog><DialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 size={16} />履歴をすべて削除</Button></DialogTrigger><DialogContent title="履歴をすべて削除しますか？"><p className="mb-5 text-sm text-[var(--subtle)]">履歴、読書位置、保存済み本文がすべて削除されます。</p><div className="flex justify-end gap-2"><DialogClose asChild><Button variant="ghost">キャンセル</Button></DialogClose><DialogClose asChild><Button variant="danger" onClick={() => void clearAll()}>削除</Button></DialogClose></div></DialogContent></Dialog></div>}{error ? <div className="grid justify-items-start gap-3" role="alert"><p>{error}</p><Button onClick={() => void runSearch(query, true)}>再試行</Button></div> : !loading && shown.length === 0 ? <p>{query ? "見つかりませんでした" : "まだ読んだ本はありません。上の検索から追加してください。"}</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((book) => <article key={book.id} className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"><Link className="block pr-8 outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-[var(--focus)]" href={`/reader?workId=${encodeURIComponent(book.workId)}&fileId=${encodeURIComponent(book.fileId)}`}><h2 className="font-semibold">{book.title}</h2><p className="mt-2 text-sm text-[var(--subtle)]">{book.author || "著者不明"}</p>{query && <p className="mt-3 text-xs text-[var(--subtle)]">{book.filename}<br />{book.format} / {book.encoding}</p>}</Link>{!query && <button className="absolute right-3 top-3 z-10 rounded p-1 hover:bg-[var(--muted)] focus-visible:ring-2" aria-label={`${book.title}を履歴から削除`} onClick={() => void remove(book.id)}><Trash2 size={17} /></button>}</article>)}</div>} {loading && <p className="mt-6 animate-pulse" aria-live="polite">読み込み中…</p>}<div ref={sentinel} className="h-8" /></div></main>;
}
