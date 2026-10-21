import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  if (await getCurrentUser()) redirect(nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/assess");
  return (
    <>
      <p className="label text-ink-3">Account</p>
      <h1 className="mt-6 text-h2 font-medium text-ink">Sign in</h1>
      <p className="mt-3 mb-10 text-body text-ink-2">Pick up where you left off.</p>
      <AuthForm mode="login" next={nextPath} />
    </>
  );
}
