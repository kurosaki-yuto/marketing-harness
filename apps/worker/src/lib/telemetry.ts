import type { Env } from "../index";

export function sendTelemetry(
  env: Env,
  event_type: string,
  payload: Record<string, unknown>
): void {
  if (env.TELEMETRY_ENABLED === "false") return;
  if (!env.LICENSE_SERVER_URL || !env.LICENSE_KEY) return;

  fetch(`${env.LICENSE_SERVER_URL}/telemetry/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      license_key: env.LICENSE_KEY,
      event_type,
      payload,
      occurred_at: new Date().toISOString(),
    }),
  }).catch(() => {});
}
