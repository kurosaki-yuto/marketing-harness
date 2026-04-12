"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home, BarChart2, BookOpen, Settings, ChevronDown, ChevronRight,
  PanelLeftClose, PanelLeftOpen, TrendingUp, FileText, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "ダッシュボード", href: "/", icon: Home },
  { label: "企業一覧", href: "/companies", icon: BarChart2 },
  { label: "KPI管理", href: "/kpi", icon: TrendingUp },
  { label: "ナレッジ", href: "/knowledge", icon: BookOpen },
  { label: "レポート", href: "/reports", icon: FileText },
  { label: "設定", href: "/settings", icon: Settings },
];

interface Account {
  id: string;
  name: string;
}

interface SidebarProps {
  accounts?: Account[];
  currentAccountId?: string;
  onSwitchAccount?: (id: string) => void;
}

export function Sidebar({ accounts = [], currentAccountId, onSwitchAccount }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);

  const currentAccount = accounts.find((a) => a.id === currentAccountId);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen border-r border-black/10 bg-white flex flex-col transition-all duration-300 z-40",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* ロゴ */}
      <div className={cn("flex items-center border-b border-black/10 h-14", isCollapsed ? "justify-center px-3" : "px-4")}>
        {!isCollapsed && (
          <span className="font-bold text-sm tracking-tight">marketing-harness</span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("text-black/40 hover:text-black transition-colors", !isCollapsed && "ml-auto")}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* アカウントスイッチャー */}
      {!isCollapsed && accounts.length > 0 && (
        <div className="px-3 py-2 border-b border-black/10">
          <button
            onClick={() => setShowAccounts(!showAccounts)}
            className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
          >
            <span className="text-black/60 truncate">{currentAccount?.name ?? "アカウント選択"}</span>
            {showAccounts ? <ChevronDown className="h-3 w-3 text-black/40 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 text-black/40 flex-shrink-0" />}
          </button>
          {showAccounts && (
            <div className="mt-1 space-y-0.5">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => { onSwitchAccount?.(acc.id); setShowAccounts(false); }}
                  className={cn(
                    "w-full text-left text-xs px-3 py-1.5 rounded-lg transition-colors",
                    acc.id === currentAccountId ? "bg-black text-white" : "hover:bg-black/5 text-black"
                  )}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ナビ */}
      <nav className={cn("flex-1 flex flex-col gap-0.5 py-3", isCollapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg transition-colors",
                isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                isActive ? "bg-black text-white" : "text-black/60 hover:bg-black/5 hover:text-black"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* アラートバッジ */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          <Link
            href="/alerts"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-black/60 hover:bg-black/5 hover:text-black transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span className="text-sm">アラート</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
