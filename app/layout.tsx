import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: { default: "balloon", template: "%s | balloon" },
  description: "青空文庫形式の文章を読む、書く、確認するためのWebアプリケーション",
  robots: { index: false, follow: false },
  openGraph: { title: "balloon", description: "青空文庫形式の文章を読む、書く、確認する", type: "website", locale: "ja_JP" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja" suppressHydrationWarning><body><ThemeProvider>{children}</ThemeProvider></body></html>;
}
