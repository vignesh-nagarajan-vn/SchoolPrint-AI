"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/food", label: "Food Consumption" },
  { href: "/water", label: "Water Usage" },
  { href: "/energy", label: "Energy Consumption" },
  { href: "/events", label: "Event Forecasting" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background shadow-sm">
      <div className="container flex h-14 items-center justify-between gap-4 overflow-x-auto">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group relative whitespace-nowrap px-1 py-2 text-sm font-medium tracking-tight transition-colors sm:text-[15px]",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
              <span
                className={cn(
                  "absolute -bottom-px left-0 h-0.5 w-full origin-left bg-foreground transition-transform duration-300 ease-out",
                  active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
