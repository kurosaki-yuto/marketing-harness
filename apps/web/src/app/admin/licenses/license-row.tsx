"use client";
import { useState } from "react";
import { revokeLicenseAction } from "./actions";
import { getIntegrations, type IntegrationsData } from "@/lib/admin/license-client";
import { IntegrationsForm } from "./integrations-form";
import { Button } from "@/components/ui/button";
import type { License } from "@/lib/admin/types";

const TOTAL_FIELDS = 10;

function countConfigured(d: IntegrationsData | null): number {
  if (!d) return 0;
  return Object.values(d).filter((v) => v && String(v).trim() !== "").length;
}

export function LicenseRow({ license }: { license: License }) {
  const [showForm, setShowForm] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationsData | null | undefined>(undefined);

  const handleRevoke = async () => {
    if (!confirm(`${license.email} のライセンスを失効しますか？`)) return;
    await revokeLicenseAction(license.key);
  };

  const handleOpenForm = async () => {
    if (integrations === undefined) {
      const data = await getIntegrations(license.key).catch(() => null);
      setIntegrations(data);
    }
    setShowForm(true);
  };

  const configured = integrations !== undefined ? countConfigured(integrations) : null;

  return (
    <>
      <tr className="hover:bg-black/[0.02]">
        <td className="px-4 py-3 font-mono text-xs text-black/70">{license.key.slice(0, 12)}…</td>
        <td className="px-4 py-3 text-sm">{license.email}</td>
        <td className="px-4 py-3 text-sm">{license.plan}</td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              license.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {license.status}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {license.status === "active" && (
              <Button type="button" variant="outline" size="sm" onClick={handleOpenForm}>
                統合設定
                {configured !== null && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    configured === TOTAL_FIELDS ? "bg-green-100 text-green-700" : "bg-black/5 text-black/50"
                  }`}>
                    {configured}/{TOTAL_FIELDS}
                  </span>
                )}
              </Button>
            )}
            {license.status === "active" && (
              <Button type="button" variant="destructive" size="sm" onClick={handleRevoke}>
                失効
              </Button>
            )}
          </div>
        </td>
      </tr>
      {showForm && (
        <IntegrationsForm
          licenseKey={license.key}
          initial={integrations ?? null}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}
