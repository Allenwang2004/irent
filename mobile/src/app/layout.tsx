import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iRent 取還車模擬",
  description: "iRent 智能車況管家：取車、還車拍照與即時品質檢查（黑客松展示用）",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // iRent has no dark mode, so neither does the simulation.
    <html lang="zh-Hant" data-theme="light" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-surface-1 shadow-sm">{children}</div>
      </body>
    </html>
  );
}
