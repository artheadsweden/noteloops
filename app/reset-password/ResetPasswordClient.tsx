"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/services/supabase/auth";
import { getBrowserSupabaseClient } from "@/services/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ResetPasswordClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Check if user has a valid session from the reset link
    const supabase = getBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      if (!data.session) {
        setStatus("Invalid or expired reset link. Please request a new one.");
      }
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setStatus("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        setStatus(error.message);
        setIsLoading(false);
        return;
      }

      setStatus("Password updated successfully! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setStatus(err.message || "An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </CardHeader>
        <CardContent>
          {!hasSession ? (
            <div className="space-y-4">
              <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                {status}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/forgot-password")}
              >
                Request New Reset Link
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>

              {status && (
                <div
                  className={`rounded-md p-3 text-sm ${
                    status.includes("successfully")
                      ? "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {status}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
