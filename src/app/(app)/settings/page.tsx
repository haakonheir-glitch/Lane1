import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { SettingsForm } from "@/components/shell/SettingsForm";
import { getExperience, getMyReport, getOutcome, getUser } from "@/lib/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [user, report, outcome, exp] = await Promise.all([getUser(), getMyReport(), getOutcome(), getExperience()]);
  return (
    <AppPage title="Settings">
      <div className="max-w-content">
        <p className="label text-ink-3">Account · {user.reportId}</p>
        <h1 className="mt-4 text-h1 font-medium text-ink">Settings</h1>
        <div className="mt-12">
          <SettingsForm user={user} hasReport={!!report} outcomeConsented={!!outcome.consentedAt} openToFaith={!!exp.openToFaith} />
        </div>
      </div>
    </AppPage>
  );
}
