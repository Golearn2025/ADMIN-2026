import { Badge } from "@/components/common/badge";
import Link from "next/link";

interface RecentBooking {
  id: string;
  reference: string;
  created_at: string;
  scheduled_at: string;
  booking_type: string;
  status: string;
  customer_first_name: string;
  customer_last_name: string;
  display_price_pence: number;
  latest_payment_status: string;
}

interface RecentBookingsTableProps {
  bookings: RecentBooking[];
}

export function RecentBookingsTable({ bookings }: RecentBookingsTableProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (pence: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(pence / 100);
  };

  const getStatusVariant = (status: string): "success" | "warning" | "error" | "info" | "neutral" => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower === "confirmed" || statusLower === "completed") return "success";
    if (statusLower === "pending_payment" || statusLower === "new") return "warning";
    if (statusLower === "cancelled" || statusLower === "failed") return "error";
    return "neutral";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="text-left p-3 font-medium text-muted-foreground">Reference</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Scheduled</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {bookings.map((booking) => (
            <tr key={booking.id} className="hover:bg-muted/50">
              <td className="p-3">
                <Link href={`/bookings`} className="font-mono text-xs text-primary hover:underline">
                  {booking.reference}
                </Link>
              </td>
              <td className="p-3">
                <div className="font-medium">
                  {booking.customer_first_name} {booking.customer_last_name}
                </div>
              </td>
              <td className="p-3">
                <span className="text-xs capitalize">{booking.booking_type}</span>
              </td>
              <td className="p-3 text-xs text-muted-foreground">
                {formatDate(booking.scheduled_at)}
              </td>
              <td className="p-3">
                <Badge variant={getStatusVariant(booking.status)} className="text-xs">
                  {booking.status}
                </Badge>
              </td>
              <td className="p-3 text-right font-medium">
                {formatPrice(booking.display_price_pence)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
