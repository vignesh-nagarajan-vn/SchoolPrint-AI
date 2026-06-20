import type { ReactNode } from "react";

export function DashboardShell({
  title,
  subtitle,
  criticalLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  criticalLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {criticalLabel && (
          <span className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            {criticalLabel}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
