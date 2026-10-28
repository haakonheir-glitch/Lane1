import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { CheckInForm } from "@/components/outcome/CheckInForm";
import { getOutcome, getUser } from "@/lib/data";
import { formatLongDate } from "@/lib/outcome";

export const metadata: Metadata = { title: "Check-in" };

const fmt = (d: Date) => formatLongDate(d, process.env.APP_TIMEZONE);

/** The outcome check-in: two questions, open 6 and 12 months after the person opted in. */
export default async function CheckInPage() {
  const [user, o] = await Promise.all([getUser(), getOutcome()]);
  return (
    <AppPage title="Check-in">
      <div className="max-w-reading">
        <p className="label text-ink-3">Check-in · {user.reportId}</p>
        <h1 className="mt-4 text-h1 font-medium text-ink">{o.due ? `Your ${o.due === "6m" ? "6-month" : "12-month"} check-in` : "Check-in"}</h1>
        {o.due ? (
          <>
            <p className="mt-4 text-body-l text-ink-2">Two questions. Your answers are stored with your account and used only to check how well the matches hold up.</p>
            <div className="mt-10">
              <CheckInForm wave={o.due} />
            </div>
          </>
        ) : (
          <div className="mt-4 flex flex-col items-start gap-6">
            <p className="text-body-l text-ink-2">
              {!o.consentedAt
                ? "You haven't signed up for check-ins. You can opt in at the end of your report."
                : o.answered.length && !o.next
                  ? "Thank you: there are no more check-ins to answer."
                  : o.next
                    ? `${o.answered.length ? "Thank you for your answers. " : ""}Your next check-in opens on ${fmt(o.next)}.`
                    : "There's no check-in open right now."}
            </p>
            <ButtonLink href="/profile" variant="secondary">
              Back to your report
            </ButtonLink>
          </div>
        )}
      </div>
    </AppPage>
  );
}
