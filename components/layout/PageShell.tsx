import * as React from "react";

import { cn } from "@/lib/utils";

export default function PageShell({
  title,
  description,
  actions,
  children,
  className
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
          {description ? (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div> : null}
      </div>

      <div className="space-y-6">{children}</div>
    </div>
  );
}
