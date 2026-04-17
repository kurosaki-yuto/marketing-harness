"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signSession, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/admin/session";

export async function loginAction(formData: FormData) {
  const password = formData.get("password") as string;
  const adminPassword = process.env.ADMIN_UI_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!adminPassword || !secret || password !== adminPassword) {
    redirect("/admin/login?error=invalid");
  }

  const token = await signSession(secret);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: COOKIE_MAX_AGE,
  });
  redirect("/admin/licenses");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}
