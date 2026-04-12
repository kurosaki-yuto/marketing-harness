"use client";

import { Bot, Settings } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  onOpenChat?: () => void;
  chatOpen?: boolean;
}

export function Header({ onOpenChat, chatOpen }: HeaderProps) {
  return (
    <header className="h-14 border-b border-black/10 bg-white flex items-center justify-between px-4 sticky top-0 z-30">
      <div />
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenChat}
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${
            chatOpen ? "bg-black text-white" : "bg-black/5 text-black hover:bg-black/10"
          }`}
        >
          <Bot className="h-4 w-4" />
          AIアシスタント
        </button>
        <Link
          href="/settings"
          className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-colors"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
