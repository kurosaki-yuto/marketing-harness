"use client";
import { revokeLicenseAction } from "./actions";
import { Button } from "@/components/ui/button";
import type { License } from "@/lib/admin/types";

export function LicenseRow({ license }: { license: License }) {
  const handleRevoke = async () => {
    if (!confirm(`${license.email} のライセンスを失効しますか？`)) return;
    await revokeLicenseAction(license.key);
  };

  return (
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
        {license.status === "active" && (
          <Button type="button" variant="destructive" size="sm" onClick={handleRevoke}>
            失効
          </Button>
        )}
      </td>
    </tr>
  );
}
