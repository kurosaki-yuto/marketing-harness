export type CommandStat = {
  date: string;
  actor: string;
  action: string;
  count: number;
};

export type FailedEvent = {
  session_id: string;
  action: string;
  error: string;
  ts: string;
};

export type ConnectorHealth = {
  connector: string;
  success_rate: number | null;
  total: number;
};

export type UsageData = {
  period_days: number;
  command_stats: CommandStat[];
  failed_events: FailedEvent[];
  connector_health: ConnectorHealth[];
};

export async function fetchUsage(days = 30): Promise<UsageData> {
  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";
  const apiKey = process.env.WORKER_API_KEY ?? "";
  const res = await fetch(`${workerUrl}/api/admin/usage?days=${days}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`usage fetch failed: ${res.status}`);
  return res.json() as Promise<UsageData>;
}
