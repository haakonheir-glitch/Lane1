import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { SettingsForm } from "@/components/shell/SettingsForm";
import { getEvidence, getProfile, getSprints, getUser } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [user, profile, sprints, evidence] = await Promise.all([getUser(), getProfile(), getSprints(), getEvidence()]);
  return (
    <AppPage title="Settings">
      <div className="max-w-content">
        <p className="label text-ink-3">Account · {user.reportId}</p>
        <h1 className="mt-4 text-h1 font-medium text-ink">Settings</h1>
        <div className="mt-12">
          <SettingsForm user={user} exportData={{ user, profile, sprints: sprints.filter((s) => s.status !== "suggested"), evidence }} />
        </div>
      </div>
    </AppPage>
  );
}
