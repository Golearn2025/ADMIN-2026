import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RefundsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Refunds"
        subtitle="Refund ledger — Stripe refunds will land here as SSOT"
      />
      <div className="px-3 sm:px-4 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-4 w-4" />
              Coming next
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Refunds need a dedicated SSOT view (booking payment + Stripe refund
              id). Until then, manage payment disputes from Bookings ops.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/bookings">Open Bookings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
