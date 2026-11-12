"use client";

import { useEffect, useState } from "react";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ReviewRow = {
  id: string;
  bookingId: string;
  bookingReference: string | null;
  rating: number;
  comment: string | null;
  ratedAt: string;
  customerName: string;
  customerEmail: string | null;
};

export function DriverReviewsTab({ driverId }: { driverId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ average: number; count: number }>({
    average: 0,
    count: 0,
  });
  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/drivers/${driverId}/reviews`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load reviews");
        if (cancelled) return;
        setSummary({
          average: Number(data.driver?.ratingAverage || 0),
          count: Number(data.driver?.ratingCount || 0),
        });
        setReviews(data.reviews || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load reviews");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [driverId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading reviews…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="text-2xl font-bold">
              {summary.count > 0 ? summary.average.toFixed(2) : "—"}
            </span>
          </div>
          <Badge variant="secondary">{summary.count} reviews</Badge>
          <p className="text-xs text-muted-foreground">
            Customer → driver ratings from completed trips
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No reviews yet for this driver.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{r.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.bookingReference || r.bookingId.slice(0, 8)}
                    {" · "}
                    {new Date(r.ratedAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      hour12: false,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                  {r.rating}.0
                </div>
              </div>
              {r.comment ? (
                <p className="mt-3 flex gap-2 text-sm text-foreground/90">
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{r.comment}</span>
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">No written review</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
