import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/assess");
  return (
    <>
      <p className="label text-ink-3">Step 00 · Account</p>
      <h1 className="mt-6 text-h2 font-medium text-ink">Create your account</h1>
      <p className="mt-3 mb-10 text-body text-ink-2">Your answers, scores and sprints are saved to it. You can export or delete everything at any time.</p>
      <AuthForm mode="signup" />
    </>
  );
}
