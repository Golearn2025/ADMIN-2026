import { Badge } from "@/components/common/badge";
import { Car, CheckCircle, CreditCard, DollarSign, Mail, Phone, XCircle } from "lucide-react";
import { getVehicleCategoryVariant } from "./bookings.utils";
import type { Booking } from "./types";

interface BookingDetailsBarProps {
  booking: Booking;
}

const getPaymentStatusVariant = (status?: string): "success" | "warning" | "error" | "neutral" => {
  if (!status) return "neutral";
  const statusLower = status.toLowerCase();
  if (statusLower === "succeeded" || statusLower === "paid") return "success";
  if (statusLower === "pending" || statusLower === "processing") return "warning";
  if (statusLower === "failed" || statusLower === "canceled") return "error";
  if (statusLower === "refunded") return "neutral";
  return "neutral";
};

export function BookingDetailsBar({ booking }: BookingDetailsBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* Customer Email */}
      {booking.customer_email && (
        <div className="bg-card border border-border/50 rounded px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span className="text-muted-foreground">{booking.customer_email}</span>
          </div>
        </div>
      )}

      {/* Driver Phone */}
      {booking.driver_phone && (
        <div className="bg-card border border-border/50 rounded px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <Phone className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span className="font-medium">{booking.driver_phone}</span>
          </div>
        </div>
      )}

      {/* Vehicle - Requested */}
      <div className="bg-card border border-border/50 rounded px-3 py-1.5 shadow-sm">
        <div className="flex items-center gap-2 text-xs">
          <Car className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          <span className="text-muted-foreground">Requested:</span>
          <Badge variant={getVehicleCategoryVariant(booking.requested_vehicle_category_label)} className="text-xs py-0 h-5">
            {booking.requested_vehicle_category_label || "N/A"}
          </Badge>
          {booking.requested_vehicle_display && (
            <span className="font-medium">{booking.requested_vehicle_display}</span>
          )}
        </div>
      </div>

      {/* Vehicle - Assigned */}
      {(booking.vehicle_make_model || booking.vehicle_plate) && (
        <div className="bg-card border border-border/50 rounded px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <Car className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
            <span className="text-muted-foreground">Assigned:</span>
            <span className="font-medium text-green-600">
              {booking.vehicle_make_model || "Vehicle"}
            </span>
            {booking.vehicle_plate && (
              <span className="font-mono text-xs text-muted-foreground">({booking.vehicle_plate})</span>
            )}
          </div>
        </div>
      )}

      {/* Payment Details */}
      {booking.latest_payment_status && (
        <div className="bg-card border border-border/50 rounded px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <CreditCard className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <Badge variant={getPaymentStatusVariant(booking.latest_payment_status)} className="text-xs py-0 h-5">
              {booking.latest_payment_status}
            </Badge>
          </div>
        </div>
      )}

      {/* Pricing Source */}
      {booking.pricing_source && (
        <div className="bg-card border border-border/50 rounded px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="text-muted-foreground">Pricing:</span>
            <span className="font-medium">{booking.pricing_source}</span>
          </div>
        </div>
      )}

      {/* Financial Snapshot */}
      {booking.has_financial_snapshot !== undefined && (
        <div className="bg-card border border-border/50 rounded px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            {booking.has_financial_snapshot ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
            <span className="text-muted-foreground">Financial:</span>
            <Badge variant={booking.has_financial_snapshot ? "success" : "neutral"} className="text-xs py-0 h-5">
              {booking.has_financial_snapshot ? "Snapshot" : "No snapshot"}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
