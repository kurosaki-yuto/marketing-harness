"use client";
import { useActionState, useState } from "react";
import { issueLicenseAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function IssueForm() {
  const [state, formAction, pending] = useActionState(issueLicenseAction, null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!state?.key) return;
    navigator.clipboard.writeText(state.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-black/10 rounded-xl p-4 space-y-4">
      <h2 className="font-semibold text-black">新規発行</h2>
      <form action={formAction} className="flex gap-2">
        <Input name="email" type="email" placeholder="user@example.com" required className="flex-1" />
        <select
          name="plan"
          defaultValue="community"
          className="rounded-lg border border-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
        >
          <option value="community">community</option>
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "発行中..." : "発行"}
        </Button>
      </form>
      {state?.ok && state.key && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-green-800 mb-1">発行成功</p>
            <p className="text-xs font-mono break-all text-green-900">{state.key}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-green-100 text-green-700 transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      )}
      {state?.ok === false && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error ?? "発行に失敗しました"}
        </p>
      )}
    </div>
  );
}
