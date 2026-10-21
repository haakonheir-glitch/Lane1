"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Wordmark } from "./Wordmark";
import { navGroups, isActive } from "./nav";
import { cn } from "@/lib/cn";
import type { User } from "@/lib/types";

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-rule px-6 py-6 lg:flex">
      <Wordmark href="/" />
      <nav aria-label="Main" className="mt-12 flex flex-col gap-8">
        {navGroups.map((g) => (
          <div key={g.label}>
            <p className="label text-ink-3">{g.label}</p>
            <ul className="mt-3 flex flex-col gap-1">
              {g.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "-mx-2 flex h-8 items-center gap-2 rounded-xs px-2 text-small transition-quiet",
                        active ? "text-ink" : "text-ink-2 hover:text-ink",
                      )}
                    >
                      <span aria-hidden className={cn("h-4 w-px", active ? "bg-accent" : "bg-transparent")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-4 border-t border-rule pt-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-full border border-rule-strong font-mono text-label text-ink-2">
            {user.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-small text-ink">{user.name}</p>
            <p className="truncate label text-ink-3">{user.reportId}</p>
          </div>
        </div>
        <Link
          href="/settings"
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 text-small transition-quiet",
            isActive(pathname, "/settings") ? "text-ink" : "text-ink-2 hover:text-ink",
          )}
        >
          <Settings aria-hidden strokeWidth={1.5} className="size-4" />
          Settings
        </Link>
        <form action={logout}>
          <button type="submit" className="flex items-center gap-2 text-small text-ink-2 transition-quiet hover:text-ink">
            <LogOut aria-hidden strokeWidth={1.5} className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
