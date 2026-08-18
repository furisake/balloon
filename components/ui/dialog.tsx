"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({ className, children, title }: { className?: string; children: React.ReactNode; title: string }) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/45" /><DialogPrimitive.Content aria-describedby={undefined} className={cn("fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl", className)}><DialogPrimitive.Title className="mb-4 text-lg font-semibold">{title}</DialogPrimitive.Title>{children}<DialogPrimitive.Close className="absolute right-3 top-3 rounded p-1" aria-label="閉じる"><X size={20} /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>;
}
