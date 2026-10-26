import { ClipboardList, FileText, Map, type LucideIcon } from "lucide-react";

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
    label: "Careers",
    items: [{ href: "/lanes", label: "Career map", short: "Careers", icon: Map }],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
