import type { Metadata } from "next";
import { Shelf } from "@/components/shelf";

export const metadata: Metadata = { title: "本棚" };
export default function ShelfPage() { return <Shelf />; }
