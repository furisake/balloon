import Link from "next/link";
import { Home } from "lucide-react";
import { EXTERNAL_URLS } from "@/config/app";
import { Button } from "./ui/button";
import { ThemeSwitch } from "./theme-provider";

const links = [
  ["/guide", "概要"], ["/guide/reader", "Reader"], ["/guide/editor", "Editor / Preview"], ["/guide/notation", "青空文庫記法"], ["/guide/references", "リファレンス"], ["/guide/contributing", "コントリビュート"],
];

export function GuideLayout({ children }: { children: React.ReactNode }) {
  const navigation = <nav className="grid gap-1">{links.map(([href, label]) => <Link key={href} href={href} className="rounded px-3 py-2 hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]">{label}</Link>)}</nav>;
  return <main className="min-h-screen"><header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3"><Button asChild variant="ghost" size="icon"><Link href="/" aria-label="ホームへ戻る"><Home size={19} /></Link></Button><strong>balloon ガイド</strong><a className="ml-auto underline" href={EXTERNAL_URLS.github} target="_blank" rel="noreferrer">GitHub</a><ThemeSwitch /></header><details className="border-b border-[var(--border)] bg-[var(--surface)] p-3 md:hidden"><summary className="cursor-pointer font-medium">ガイド目次</summary><div className="mt-3">{navigation}</div></details><div className="mx-auto flex max-w-6xl"><aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-[var(--border)] p-5 md:block">{navigation}</aside><article className="guide-prose min-w-0 flex-1 px-6 py-10 md:px-12">{children}</article></div></main>;
}
