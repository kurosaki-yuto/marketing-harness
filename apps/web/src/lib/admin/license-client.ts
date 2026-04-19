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

export type IntegrationsData = {
  meta_access_token?: string;
  meta_ad_account_id?: string;
  line_channel_access_token?: string;
  line_channel_secret?: string;
  utage_api_key?: string;
  google_ads_developer_token?: string;
  google_ads_client_id?: string;
  google_ads_client_secret?: string;
  google_ads_refresh_token?: string;
  google_ads_customer_id?: string;
};

export async function getIntegrations(key: string): Promise<IntegrationsData | null> {
  const res = await fetch(`${workerUrl()}/admin/licenses/${key}/integrations`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`get integrations failed: ${res.status}`);
  const data = (await res.json()) as { integrations: IntegrationsData | null };
  return data.integrations;
}

export async function putIntegrations(key: string, data: IntegrationsData): Promise<void> {
  const res = await fetch(`${workerUrl()}/admin/licenses/${key}/integrations`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
}
