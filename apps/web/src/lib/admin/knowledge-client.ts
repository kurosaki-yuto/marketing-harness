function workerUrl() {
  return process.env.LICENSE_WORKER_URL!;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Admin-Token": process.env.LICENSE_ADMIN_TOKEN!,
  };
}

export type KnowledgeTopic = {
  topic: string;
  updated_at: string;
};

export type KnowledgeEntry = {
  topic: string;
  content: string;
  updated_at: string;
};

export async function listCentralKnowledge(): Promise<KnowledgeTopic[]> {
  const res = await fetch(`${workerUrl()}/knowledge`, { cache: "no-store" });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const data = (await res.json()) as { topics: KnowledgeTopic[] };
  return data.topics;
}

export async function getCentralKnowledge(topic: string): Promise<KnowledgeEntry | null> {
  const res = await fetch(`${workerUrl()}/knowledge/${encodeURIComponent(topic)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`get failed: ${res.status}`);
  return res.json() as Promise<KnowledgeEntry>;
}

export async function putCentralKnowledge(topic: string, content: string): Promise<void> {
  const res = await fetch(`${workerUrl()}/admin/knowledge/${encodeURIComponent(topic)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteCentralKnowledge(topic: string): Promise<void> {
  const res = await fetch(`${workerUrl()}/admin/knowledge/${encodeURIComponent(topic)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}
