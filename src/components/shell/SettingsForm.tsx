"use client";

import { useActionState, useRef } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { ThemeToggle } from "./ThemeToggle";
import { deleteAccount, updateProfile, type FormState } from "@/app/actions/account";
import { logout } from "@/app/actions/auth";
import type { User } from "@/lib/types";

const AGE_RANGES = ["18–24", "25–34", "35–44", "45–54", "55 or over"];

function Row({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-rule py-10 md:grid-cols-[240px_1fr] md:gap-12">
      <div>
        <h2 className="text-body font-medium text-ink">{label}</h2>
        <p className="mt-1 text-small text-ink-3">{description}</p>
      </div>
      <div className="max-w-[520px]">{children}</div>
    </section>
  );
}

export function SettingsForm({ user }: { user: User }) {
  const [profileState, saveProfile, saving] = useActionState<FormState, FormData>(updateProfile, undefined);
  const [deleteState, doDelete, deleting] = useActionState<FormState, FormData>(deleteAccount, undefined);
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <div>
      <Row label="Profile" description="Used on your report header. Never shared.">
        <form action={saveProfile} className="flex flex-col gap-6">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" defaultValue={user.name} autoComplete="name" required />
          </Field>
          <Field label="Email" htmlFor="email" hint="Also your sign-in.">
            <Input id="email" name="email" type="email" defaultValue={user.email} autoComplete="email" required />
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Age range" htmlFor="age">
              <Select id="age" name="ageRange" defaultValue={user.ageRange}>
                <option value="">Prefer not to say</option>
                {AGE_RANGES.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </Select>
            </Field>
            <Field label="City" htmlFor="city">
              <Input id="city" name="city" defaultValue={user.city} autoComplete="address-level2" />
            </Field>
          </div>
          <div className="flex items-center gap-4">
            <Button type="submit" variant="secondary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <span className={profileState?.error ? "text-small text-caution" : "text-small text-positive"} aria-live="polite">
              {profileState?.error ?? (profileState?.ok ? "Saved." : "")}
            </span>
          </div>
        </form>
      </Row>

      <Row label="Appearance" description="Auto follows your system setting.">
        <ThemeToggle />
      </Row>

      <Row label="Your data" description="Everything Lane holds about you, in one file.">
        <p className="text-small text-ink-2">
          Includes your answers, game responses, scores, sprints and check-ins as JSON. You can take it anywhere.
        </p>
        <a href="/api/export" download className={`${buttonClass({ variant: "secondary" })} mt-4`}>
          Export data (.json)
        </a>
      </Row>

      <Row label="Session" description="Signed in as this account on this device.">
        <form action={logout}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </Row>

      <Row label="Delete account" description="Permanent. Cannot be undone.">
        <p className="text-small text-ink-2">
          Deletes your account, answers, scores, sprints and evidence record immediately. Anonymous counts you already
          contributed to (for example &quot;people who completed a sprint&quot;) are recomputed without you.
        </p>
        <Button variant="secondary" className="mt-4 border-caution text-caution hover:bg-caution hover:text-bg" onClick={() => dialog.current?.showModal()}>
          Delete account…
        </Button>
        <dialog
          ref={dialog}
          aria-labelledby="del-h"
          className="m-auto w-[min(480px,calc(100vw-32px))] rounded-sm border border-rule-strong bg-surface p-0 text-ink backdrop:bg-ink/30"
        >
          <form action={doDelete} className="flex flex-col gap-6 p-6">
            <div>
              <p className="label text-caution">Irreversible</p>
              <h2 id="del-h" className="mt-2 text-h3 font-medium">
                Delete your account?
              </h2>
              <p className="mt-2 text-small text-ink-2">Enter your password and type DELETE to confirm.</p>
            </div>
            <Field label="Password" htmlFor="del-pw">
              <Input id="del-pw" name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="Type DELETE" htmlFor="del-confirm">
              <Input id="del-confirm" name="confirm" className="font-mono" autoComplete="off" required />
            </Field>
            <p role="alert" className="min-h-5 text-small text-caution">
              {deleteState?.error ?? ""}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => dialog.current?.close()}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary" disabled={deleting} className="border-caution text-caution hover:bg-caution hover:text-bg">
                {deleting ? "Deleting…" : "Delete permanently"}
              </Button>
            </div>
          </form>
        </dialog>
      </Row>
    </div>
  );
}
