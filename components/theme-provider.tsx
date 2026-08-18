"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun, CloudSun } from "lucide-react";
import { Button } from "./ui/button";

type Theme = "light" | "dark" | "sky";
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);
  useEffect(() => { const saved = localStorage.getItem("balloon-theme"); if (saved === "light" || saved === "dark" || saved === "sky") setTheme(saved); setReady(true); }, []);
  useEffect(() => { if (!ready) return; document.documentElement.dataset.theme = theme; localStorage.setItem("balloon-theme", theme); }, [ready, theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function ThemeSwitch() {
  const context = useContext(ThemeContext);
  if (!context) return null;
  const next: Record<Theme, Theme> = { light: "dark", dark: "sky", sky: "light" };
  const label: Record<Theme, string> = { light: "Light", dark: "Dark", sky: "Sky" };
  const Icon = context.theme === "light" ? Sun : context.theme === "dark" ? Moon : CloudSun;
  return <Button variant="ghost" size="sm" onClick={() => context.setTheme(next[context.theme])} aria-label={`テーマ: ${label[context.theme]}。切り替える`}><Icon size={17} />{label[context.theme]}</Button>;
}
