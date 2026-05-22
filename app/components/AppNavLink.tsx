"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

function pathMatches(current: string, href: string): boolean {
  if (href === "/") return current === "/";
  return current === href || current.startsWith(`${href}/`);
}

export function AppNavLink({ href, className, style, children }: Props) {
  const pathname = usePathname() ?? "";
  const active = pathMatches(pathname, href);
  return (
    <Link href={href} className={className} style={style} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
