import Link from "next/link";

import AccountClient from "@/app/account/AccountClient";
import InstallAppCard from "@/app/account/InstallAppCard";
import ThemeToggle from "@/app/account/ThemeToggle";
import AppFrame from "@/app/components/AppFrame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPage() {
  return (
    <AppFrame>
      <Button asChild variant="link" className="px-0">
        <Link href="/dashboard">Back to Library</Link>
      </Button>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Copy your Supabase Auth user id for admin setup.</CardDescription>
          </CardHeader>
          <CardContent>
            <AccountClient />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Switch between light and dark mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Install</CardTitle>
            <CardDescription>Install this site as an app (when supported).</CardDescription>
          </CardHeader>
          <CardContent>
            <InstallAppCard />
          </CardContent>
        </Card>
      </div>
    </AppFrame>
  );
}
