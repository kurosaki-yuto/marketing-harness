import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "marketing-harness",
  description: "広告運用AIエージェント — OSS版",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
