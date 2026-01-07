import Link from "next/link";

import LoginClient from "@/app/login/LoginClient";
import AppFrame from "@/app/components/AppFrame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <AppFrame>
      <Button asChild variant="link" className="px-0">
        <Link href="/dashboard">Back to Library</Link>
      </Button>

      <Card className="mt-6 max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <p className="text-sm text-muted-foreground">Used for syncing progress and feedback.</p>
        </CardHeader>
        <CardContent>
          <LoginClient />
        </CardContent>
      </Card>
    </AppFrame>
  );
}
