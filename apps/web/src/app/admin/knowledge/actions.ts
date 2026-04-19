"use server";
import { revalidatePath } from "next/cache";
import { putCentralKnowledge, deleteCentralKnowledge } from "@/lib/admin/knowledge-client";

export type KnowledgeState = { ok: boolean; error?: string } | null;

export async function saveKnowledgeAction(
  topic: string,
  content: string
): Promise<KnowledgeState> {
  try {
    await putCentralKnowledge(topic, content);
    revalidatePath("/admin/knowledge");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteKnowledgeAction(topic: string): Promise<void> {
  await deleteCentralKnowledge(topic);
  revalidatePath("/admin/knowledge");
}
