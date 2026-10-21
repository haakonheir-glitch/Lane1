"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { ThemeToggle } from "./ThemeToggle";
import type { User } from "@/lib/types";

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

export function SettingsForm({ user, exportData }: { user: User; exportData: unknown }) {
  const [status, setStatus] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  function save(e: FormEvent) {
    e.preventDefault();
    setStatus("Saved. (Mocked — nothing leaves this browser.)");
  }

  function download() {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lane-export-${user.reportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Row label="Profile" description="Used on your report header. Never shared.">
        <form onSubmit={save} className="flex flex-col gap-6">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" defaultValue={user.name} autoComplete="name" />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={user.email} autoComplete="email" />
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Age range" htmlFor="age">
              <Select id="age" name="age" defaultValue={user.ageRange}>
                {["18–24", "25–34", "35–44", "45–54", "55+"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </Select>
            </Field>
            <Field label="City" htmlFor="city">
              <Input id="city" name="city" defaultValue={user.city} autoComplete="address-level2" />
            </Field>
          </div>
          <div className="flex items-center gap-4">
            <Button type="submit" variant="secondary">
              Save changes
            </Button>
            <span className="text-small text-ink-3" aria-live="polite">
              {status}
            </span>
          </div>
        </form>
      </Row>

      <Row label="Appearance" description="Auto follows your system setting.">
        <ThemeToggle />
      </Row>

      <Row label="Your data" description="Everything we hold about you, in one file.">
        <p className="text-small text-ink-2">
          Includes your answers, scores, sprints, check-ins and evidence record as JSON. You can take it anywhere.
        </p>
        <Button variant="secondary" className="mt-4" onClick={download}>
          Export data (.json)
        </Button>
      </Row>

      <Row label="Delete account" description="Permanent. Cannot be undone.">
        {deleted ? (
          <p className="text-small text-ink-2" role="status">
            Deletion requested. In the real product your data would be erased within 30 days. (Mocked.)
          </p>
        ) : (
          <>
            <p className="text-small text-ink-2">
              Deletes your profile, sprints and evidence record. Anonymised aggregates that you already contributed to
              cannot be un-computed, but contain nothing that identifies you.
            </p>
            <Button variant="secondary" className="mt-4 border-caution text-caution hover:bg-caution hover:text-bg" onClick={() => dialog.current?.showModal()}>
              Delete account…
            </Button>
          </>
        )}
        <dialog
          ref={dialog}
          aria-labelledby="del-h"
          className="m-auto w-[min(480px,calc(100vw-32px))] rounded-sm border border-rule-strong bg-surface p-0 text-ink backdrop:bg-ink/30"
          onClose={() => setConfirmText("")}
        >
          <form
            method="dialog"
            className="flex flex-col gap-6 p-6"
            onSubmit={(e) => {
              if (confirmText !== "DELETE") {
                e.preventDefault();
                return;
              }
              setDeleted(true);
            }}
          >
            <div>
              <p className="label text-caution">Irreversible</p>
              <h2 id="del-h" className="mt-2 text-h3 font-medium">
                Delete your account?
              </h2>
              <p className="mt-2 text-small text-ink-2">Type DELETE to confirm.</p>
            </div>
            <Input aria-label="Type DELETE to confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="font-mono" autoComplete="off" />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => dialog.current?.close()}>
                Cancel
              </Button>
              <Button type="submit" variant="secondary" disabled={confirmText !== "DELETE"} className="border-caution text-caution hover:bg-caution hover:text-bg">
                Delete
              </Button>
            </div>
          </form>
        </dialog>
      </Row>
    </div>
  );
}
