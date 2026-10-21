import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/cn";

/** Standard app page: top bar + main region with page margins. */
export function AppPage({
  title,
  meta,
  action,
  children,
  bleed,
  className,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Skip the default page padding (for full-bleed flows like the assessment runner). */
  bleed?: boolean;
  className?: string;
}) {
  return (
    <>
      <TopBar title={title} meta={meta} action={action} />
      <main id="main" className={cn(bleed ? "flex-1" : "page flex-1 pt-10 pb-24 sm:pt-12 lg:mx-0 lg:max-w-[calc(1200px+96px)]", className)}>
        {children}
      </main>
    </>
  );
}
