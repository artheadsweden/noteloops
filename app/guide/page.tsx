import AppFrame from "@/app/components/AppFrame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GuideClient from "@/app/guide/GuideClient";

export default function GuidePage() {
  return (
    <AppFrame>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quick Start for first-time readers, plus a full guide you can reference later.
          </p>
        </CardHeader>
        <CardContent>
          <GuideClient />
        </CardContent>
      </Card>
    </AppFrame>
  );
}
