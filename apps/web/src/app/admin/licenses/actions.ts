"use server";
import { revalidatePath } from "next/cache";
import { issueLicense, revokeLicense } from "@/lib/admin/license-client";

export type IssueState = { ok: boolean; key?: string; error?: string } | null;

export async function issueLicenseAction(
  _prev: IssueState,
  formData: FormData
): Promise<IssueState> {
  const email = (formData.get("email") as string).trim();
  const plan = (formData.get("plan") as string) || "community";
  try {
    const license = await issueLicense(email, plan);
    revalidatePath("/admin/licenses");
    return { ok: true, key: license.key };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function revokeLicenseAction(key: string): Promise<void> {
  await revokeLicense(key);
  revalidatePath("/admin/licenses");
}
