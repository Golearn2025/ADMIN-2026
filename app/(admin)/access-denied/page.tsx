import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Access Denied
          </h1>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to access the admin dashboard.
          </p>
          <p className="text-xs text-muted-foreground">
            Only users with <strong>root</strong>, <strong>owner</strong>, or{" "}
            <strong>admin</strong> roles can access this area.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            If you believe this is an error, please contact your organization
            administrator.
          </p>
          <Link href="/sign-out">
            <Button variant="outline" className="w-full">
              Sign Out
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
