export async function workerGet(cfg, path, params = {}) {
  if (!cfg?.workerUrl || !cfg?.apiKey) return null;
  const url = new URL(path, cfg.workerUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 2000);
  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      signal: ac.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
