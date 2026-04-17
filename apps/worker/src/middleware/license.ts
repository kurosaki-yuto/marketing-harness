import { createMiddleware } from "hono/factory";
import type { Env } from "../index";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type AccountLicense = {
  license_key: string | null;
  license_plan: string | null;
  license_expires_at: string | null;
  license_last_verified_at: string | null;
  instance_id: string | null;
};

async function verifyWithServer(
  licenseServerUrl: string,
  licenseKey: string,
  instanceId: string
): Promise<{ valid: boolean; plan?: string; expires_at?: string | null; reason?: string }> {
  try {
    const res = await fetch(`${licenseServerUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: licenseKey, instance_id: instanceId }),
    });
    return await res.json();
  } catch {
    // license-server が落ちている場合は通す（冪等性のため）
    return { valid: true, plan: "community" };
  }
}

export const licenseMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { accountId: string };
}>(async (c, next) => {
  const accountId = c.get("accountId");

  const account = await c.env.DB.prepare(
    "SELECT license_key, license_plan, license_expires_at, license_last_verified_at, instance_id FROM accounts WHERE id = ?"
  )
    .bind(accountId)
    .first<AccountLicense>();

  if (!account) {
    return c.json({ error: "Account not found" }, 401);
  }

  // ライセンスキー未設定 = 未初期化インスタンス → 拒否
  if (!account.license_key) {
    return c.json({ error: "License not configured" }, 403);
  }

  const now = Date.now();
  const lastVerified = account.license_last_verified_at
    ? new Date(account.license_last_verified_at).getTime()
    : 0;
  const needsReVerify = now - lastVerified > CACHE_TTL_MS;

  if (needsReVerify) {
    const instanceId = account.instance_id ?? crypto.randomUUID();
    const result = await verifyWithServer(
      c.env.LICENSE_SERVER_URL,
      account.license_key,
      instanceId
    );

    if (!result.valid) {
      return c.json({ error: "License revoked or expired", reason: result.reason }, 403);
    }

    // 検証結果をキャッシュ
    await c.env.DB.prepare(
      `UPDATE accounts SET
        license_plan = ?,
        license_expires_at = ?,
        license_last_verified_at = datetime('now'),
        instance_id = ?
       WHERE id = ?`
    )
      .bind(result.plan ?? account.license_plan, result.expires_at ?? null, instanceId, accountId)
      .run();
  }

  await next();
});
