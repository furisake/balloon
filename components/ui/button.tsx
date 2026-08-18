import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: "default" | "ghost" | "danger"; size?: "default" | "icon" | "sm" };
export function Button({ asChild, className, variant = "default", size = "default", ...props }: Props) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:pointer-events-none disabled:opacity-50", variant === "default" && "bg-[var(--accent)] text-white hover:opacity-90", variant === "ghost" && "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--muted)]", variant === "danger" && "bg-red-700 text-white", size === "default" && "h-10 px-4", size === "sm" && "h-8 px-3 text-sm", size === "icon" && "size-10", className)} {...props} />;
}
