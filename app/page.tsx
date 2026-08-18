import Link from "next/link";
import { BookOpen, FilePenLine, Library } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-provider";

const items = [
  {
    href: "/shelf",
    label: "本棚",
    description: "作品を探して読む",
    Icon: Library,
  },
  {
    href: "/editor",
    label: "Editor",
    description: "原稿を書いて確認する",
    Icon: FilePenLine,
  },
  {
    href: "/guide",
    label: "ガイド",
    description: "使い方と青空文庫記法",
    Icon: BookOpen,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-2xl font-semibold tracking-wide">balloon</h1>
        </div>
        <ThemeSwitch />
      </header>
      <div className="grid flex-1 content-center gap-4 py-16 md:grid-cols-3">
        {items.map(({ href, label, description, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-7 outline-none transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          >
            <Icon className="mb-8 text-[var(--accent)]" size={30} />
            <h2 className="text-xl font-semibold">{label}</h2>
            <p className="mt-2 text-sm text-[var(--subtle)]">{description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
