import Link from "next/link";
import { Suspense } from "react";

import SignupClient from "@/app/signup/SignupClient";
import AppFrame from "@/app/components/AppFrame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <AppFrame>
      <Button asChild variant="link" className="px-0">
        <Link href="/login">Already have an account? Sign in</Link>
      </Button>

      <Card className="mt-6 max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <p className="text-sm text-muted-foreground">Invite-only signup.</p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
            <SignupClient />
          </Suspense>
        </CardContent>
      </Card>
    </AppFrame>
  );
}
