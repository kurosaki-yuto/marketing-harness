"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, ChevronRight, Loader2, BookOpen } from "lucide-react";
import { getStreamUrl, getAuthHeaders } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  onClose: () => void;
  companyId?: string;
}

export function ChatPanel({ onClose, companyId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "広告運用についてお気軽にご質問ください。\n\n例えば：\n- CTRを改善するにはどうすればいい？\n- 今月のCPAが高い原因は？\n- 来月の予算配分のアドバイスを教えて",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const apiMessages = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(getStreamUrl("/api/chat"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ messages: apiMessages, companyId }),
      });

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const obj = JSON.parse(line.slice(6)) as { text?: string };
            if (obj.text) {
              full += obj.text;
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: full } : m)
              );
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "エラーが発生しました。再試行してください。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="w-96 flex flex-col h-full border-l border-black/10 bg-white">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/10">
        <button onClick={onClose} className="text-black/40 hover:text-black transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm">AIアシスタント</span>
        </div>
      </div>

      {/* メッセージ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-black" : "bg-blue-600"}`}>
              {msg.role === "user" ? <User className="h-3.5 w-3.5 text-white" /> : <Bot className="h-3.5 w-3.5 text-white" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${msg.role === "user" ? "bg-black text-white" : "bg-white border border-black/10 shadow-sm"}`}>
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: (p) => <p className="mb-2 last:mb-0 leading-relaxed" {...p} />,
                      strong: (p) => <strong className="font-bold text-blue-700" {...p} />,
                      ul: (p) => <ul className="list-disc ml-3 mb-2 space-y-1" {...p} />,
                      ol: (p) => <ol className="list-decimal ml-3 mb-2 space-y-1" {...p} />,
                      h3: (p) => <h3 className="text-sm font-bold mt-3 mb-1 first:mt-0" {...p} />,
                      table: (p) => <table className="w-full border-collapse my-2 text-xs" {...p} />,
                      th: (p) => <th className="border border-black/10 px-2 py-1 text-left font-semibold bg-black/5" {...p} />,
                      td: (p) => <td className="border border-black/10 px-2 py-1" {...p} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="bg-white border border-black/10 rounded-2xl px-3.5 py-2.5">
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <div key={delay} className="w-1.5 h-1.5 bg-black/30 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力 */}
      <div className="p-3 border-t border-black/10 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力... (⌘+Enter で送信)"
            disabled={loading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50"
          />
          <Button
            onClick={send}
            disabled={loading || !input.trim()}
            size="sm"
            className="h-9 w-9 p-0 rounded-xl flex-shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
