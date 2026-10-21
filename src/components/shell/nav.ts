import { Activity, ClipboardList, FileText, Map, ScrollText, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; short: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Profile",
    items: [
      { href: "/assess", label: "Assessment", short: "Assess", icon: ClipboardList },
      { href: "/profile", label: "Profile report", short: "Profile", icon: FileText },
    ],
  },
  {
    label: "Lanes",
    items: [{ href: "/lanes", label: "Lane Map", short: "Lanes", icon: Map }],
  },
  {
    label: "Evidence",
    items: [
      { href: "/sprints", label: "Sprints", short: "Sprints", icon: Activity },
      { href: "/evidence", label: "Evidence Record", short: "Evidence", icon: ScrollText },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
