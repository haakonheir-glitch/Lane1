import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xs border whitespace-nowrap select-none transition-quiet disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent border-accent text-accent-ink hover:opacity-90",
  secondary: "bg-transparent border-ink text-ink hover:bg-ink hover:text-bg",
  ghost: "bg-transparent border-transparent text-ink-2 hover:text-ink hover:bg-rule/60",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-small",
  sm: "h-8 px-3 text-small",
};

type StyleProps = { variant?: Variant; size?: Size; mono?: boolean };

export function buttonClass({ variant = "primary", size = "md", mono = false }: StyleProps = {}) {
  return cn(base, variants[variant], sizes[size], mono ? "label" : "font-medium");
}

export function Button({
  variant,
  size,
  mono,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={cn(buttonClass({ variant, size, mono }), className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  mono,
  className,
  href,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & StyleProps & { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={cn(buttonClass({ variant, size, mono }), className)} {...props}>
      {children}
    </Link>
  );
}
