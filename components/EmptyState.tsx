import * as React from "react";

import { Button } from "@/components/ui/button";

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-8 text-center shadow-[var(--shadow)]">
      {icon ? <div className="mx-auto flex h-10 w-10 items-center justify-center text-muted-foreground">{icon}</div> : null}
      <div className="mt-3 text-base font-semibold">{title}</div>
      {description ? (
        <p className="mx-auto mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {actionLabel ? (
        <div className="mt-5">
          {actionHref ? (
            <Button asChild>
              <a href={actionHref}>{actionLabel}</a>
            </Button>
          ) : (
            <Button type="button" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
