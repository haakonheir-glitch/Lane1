import Link from "next/link";
import { Wordmark } from "@/components/shell/Wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="page flex h-14 items-center justify-between border-b border-rule">
        <Wordmark />
        <Link href="/method" className="label text-ink-3 transition-quiet hover:text-ink">
          Method
        </Link>
      </header>
      <main id="main" className="page flex min-h-[calc(100dvh-3.5rem)] items-start justify-center pt-16 pb-24 sm:pt-24">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </>
  );
}
