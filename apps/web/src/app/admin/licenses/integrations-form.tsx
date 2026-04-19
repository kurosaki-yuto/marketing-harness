"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setIntegrationsAction } from "./actions";
import type { IntegrationsData } from "@/lib/admin/license-client";

const FIELDS: { key: keyof IntegrationsData; label: string; placeholder?: string }[] = [
  { key: "meta_access_token", label: "Meta アクセストークン", placeholder: "EAA..." },
  { key: "meta_ad_account_id", label: "Meta 広告アカウント ID", placeholder: "act_..." },
  { key: "line_channel_access_token", label: "LINE チャンネルアクセストークン" },
  { key: "line_channel_secret", label: "LINE チャンネルシークレット" },
  { key: "utage_api_key", label: "UTAGE API キー" },
  { key: "google_ads_developer_token", label: "Google Ads Developer Token" },
  { key: "google_ads_client_id", label: "Google Ads クライアント ID" },
  { key: "google_ads_client_secret", label: "Google Ads クライアントシークレット" },
  { key: "google_ads_refresh_token", label: "Google Ads リフレッシュトークン" },
  { key: "google_ads_customer_id", label: "Google Ads カスタマー ID", placeholder: "1234567890" },
];

export function IntegrationsForm({
  licenseKey,
  initial,
  onClose,
}: {
  licenseKey: string;
  initial: IntegrationsData | null;
  onClose: () => void;
}) {
  const [values, setValues] = useState<IntegrationsData>(initial ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await setIntegrationsAction(licenseKey, values);
    setSaving(false);
    if (result?.ok) {
      setSuccess(true);
      setTimeout(onClose, 800);
    } else {
      setError(result?.error ?? "保存に失敗しました");
    }
  };

  const configuredCount = FIELDS.filter((f) => values[f.key]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-black/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-black">統合設定</h3>
              <p className="text-xs text-black/50 mt-0.5 font-mono">{licenseKey.slice(0, 16)}…</p>
            </div>
            <span className="text-xs bg-black/5 text-black/60 px-2 py-1 rounded-full">
              {configuredCount} / {FIELDS.length} 設定済み
            </span>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-black/60 mb-1">{field.label}</label>
              <Input
                value={values[field.key] ?? ""}
                placeholder={field.placeholder ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value || undefined }))}
                className="font-mono text-xs"
              />
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-black/10 flex items-center justify-between gap-3">
          {error && <p className="text-xs text-red-600 flex-1">{error}</p>}
          {success && <p className="text-xs text-green-600 flex-1">保存しました</p>}
          {!error && !success && <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
