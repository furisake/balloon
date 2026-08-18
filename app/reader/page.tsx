import type { Metadata } from "next";
import { Suspense } from "react";
import { Reader } from "@/components/reader";

export const metadata: Metadata = { title: "Reader" };
export default function ReaderPage() { return <Suspense fallback={<main className="p-8">読み込み中…</main>}><Reader /></Suspense>; }
