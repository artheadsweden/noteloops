import Link from "next/link";

import AdminClient from "@/app/admin/AdminClient";
import AppFrame from "@/app/components/AppFrame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <AppFrame>
      <Button asChild variant="link" className="px-0">
        <Link href="/dashboard">Back to Library</Link>
      </Button>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Admin</CardTitle>
          <p className="text-sm text-muted-foreground">Manage invite codes and reader progress.</p>
        </CardHeader>
        <CardContent>
          <AdminClient />
        </CardContent>
      </Card>
    </AppFrame>
  );
}
