import * as React from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SectionCard({
  title,
  description,
  actions,
  children,
  footer,
  className,
  contentClassName
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      {title || description || actions ? (
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </CardHeader>
      ) : null}

      <CardContent className={cn(title || description || actions ? undefined : "p-6", contentClassName)}>
        {children}
      </CardContent>

      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}
