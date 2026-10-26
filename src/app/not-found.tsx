import Link from "next/link";
import { Wordmark } from "@/components/shell/Wordmark";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <header className="border-b border-rule">
        <div className="page flex h-14 items-center">
          <Wordmark />
        </div>
      </header>
      <main id="main" className="page pt-24 pb-32">
        <div className="max-w-reading border-t border-ink pt-3">
          <p className="label text-ink">ERR 404</p>
          <h1 className="mt-8 text-h1 font-medium text-ink">No record at this address.</h1>
          <p className="mt-4 text-body-l text-ink-2">
            The page may have moved, or the link may be mistyped. Nothing about your data has changed.
          </p>
          <dl className="mt-10 grid grid-cols-2 gap-4 border-y border-rule py-4 font-mono text-label uppercase">
            <dt className="text-ink-3">Status</dt>
            <dd className="text-ink">Not found</dd>
            <dt className="text-ink-3">Confidence</dt>
            <dd className="text-ink">High</dd>
          </dl>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/">Go to the start</ButtonLink>
            <ButtonLink href="/lanes" variant="secondary">
              Open Career map
            </ButtonLink>
          </div>
          <p className="mt-8 text-small text-ink-3">
            Looking for the science? <Link href="/method" className="text-ink underline decoration-rule-strong underline-offset-4">Read the method</Link>.
          </p>
        </div>
      </main>
    </>
  );
}
