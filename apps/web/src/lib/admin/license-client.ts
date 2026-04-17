import type { License } from "./types";

function workerUrl() {
  return process.env.LICENSE_WORKER_URL!;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Admin-Token": process.env.LICENSE_ADMIN_TOKEN!,
  };
}

export async function listLicenses(): Promise<License[]> {
  const res = await fetch(`${workerUrl()}/admin/licenses`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const data = (await res.json()) as { licenses: License[] };
  return data.licenses;
}

export async function issueLicense(
  email: string,
  plan: string
): Promise<{ key: string; email: string; plan: string; expires_at: string | null }> {
  const res = await fetch(`${workerUrl()}/admin/licenses`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, plan }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ key: string; email: string; plan: string; expires_at: string | null }>;
}

export async function revokeLicense(key: string): Promise<void> {
  const res = await fetch(`${workerUrl()}/admin/licenses/${key}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`revoke failed: ${res.status}`);
}
