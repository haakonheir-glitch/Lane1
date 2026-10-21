"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, isActive } from "./nav";
import { cn } from "@/lib/cn";

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-1 transition-quiet",
                  active ? "text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                {active ? <span aria-hidden className="absolute inset-x-4 top-0 h-px bg-accent" /> : null}
                <Icon aria-hidden strokeWidth={1.5} className="size-5" />
                <span className="font-mono text-[10px] uppercase leading-3 tracking-label">{item.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
