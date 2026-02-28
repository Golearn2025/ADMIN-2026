import { Badge } from "@/components/common/badge";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { Car, CheckCircle, CreditCard, DollarSign, Mail, Phone, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDate, getVehicleCategoryVariant } from "./bookings.utils";
import type { Booking } from "./types";

interface BookingExpandedRowProps {
  booking: Booking;
}

interface BookingLeg {
  leg_number: number;
  leg_role: string;
  scheduled_at: string;
  pickup_address: string;
  dropoff_address: string;
  assigned_driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  assigned_vehicle_id: string | null;
  vehicle_plate: string | null;
  vehicle_make_model: string | null;
}

interface FleetSlot {
  slot_number: number;
  slot_status: string;
  requested_vehicle_category_label: string;
  requested_vehicle_model_label: string;
  assigned_driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  assigned_vehicle_id: string | null;
  vehicle_plate: string | null;
  vehicle_make_model: string | null;
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

export function BookingExpandedRow({ booking }: BookingExpandedRowProps) {
  const [legs, setLegs] = useState<BookingLeg[]>([]);
  const [slots, setSlots] = useState<FleetSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isReturn = booking.booking_type === "return";
  const isFleet = booking.booking_type === "fleet";

  useEffect(() => {
    const fetchData = async () => {
      if (!isReturn && !isFleet) {
        return;
      }

      setIsLoading(true);
      try {
        if (isReturn) {
          const response = await fetch(`/api/admin/bookings/${booking.id}/legs`);
          const result = await response.json();
          if (response.ok) {
            setLegs(result.data || []);
          }
        } else if (isFleet) {
          const response = await fetch(`/api/admin/bookings/${booking.id}/fleet-slots`);
          const result = await response.json();
          if (response.ok) {
            setSlots(result.data || []);
          }
        }
      } catch (error) {
        console.error("Error fetching expanded data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [booking.id, isReturn, isFleet]);

  const renderAdditionalDetails = () => (
    <div className="flex flex-wrap items-center gap-4 text-xs bg-muted/30 rounded-lg p-4">
      {/* Customer Email */}
      {booking.customer_email && (
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-500" />
          <span className="text-muted-foreground">{booking.customer_email}</span>
        </div>
      )}

      {/* Divider */}
      {booking.customer_email && <span className="text-border">•</span>}

      {/* Driver Phone */}
      {booking.driver_phone && (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-green-500" />
          <span className="font-medium">{booking.driver_phone}</span>
        </div>
      )}

      {/* Divider */}
      {booking.driver_phone && <span className="text-border">•</span>}

      {/* Vehicle - Requested + Assigned */}
      <div className="flex items-center gap-2">
        <Car className="w-4 h-4 text-purple-500" />
        <span className="text-muted-foreground text-xs">Requested:</span>
        <Badge variant={getVehicleCategoryVariant(booking.requested_vehicle_category_label)} className="text-xs">
          {booking.requested_vehicle_category_label || "N/A"}
        </Badge>
        {booking.requested_vehicle_display && (
          <span className="font-medium">{booking.requested_vehicle_display}</span>
        )}
        {(booking.vehicle_make_model || booking.vehicle_plate) && (
          <>
            <span className="text-muted-foreground mx-1">→</span>
            <span className="text-muted-foreground text-xs">Assigned:</span>
            <span className="font-medium text-green-600">
              {booking.vehicle_make_model || "Vehicle"}
              {booking.vehicle_plate && (
                <span className="font-mono ml-1.5">({booking.vehicle_plate})</span>
              )}
            </span>
            {booking.vehicle_status && (
              <Badge variant="neutral" className="text-xs ml-1">
                {booking.vehicle_status}
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <span className="text-border">•</span>

      {/* Payment Details */}
      {booking.latest_payment_status && (
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-amber-500" />
          <Badge variant={getPaymentStatusVariant(booking.latest_payment_status)} className="text-xs">
            {booking.latest_payment_status}
          </Badge>
          {booking.latest_payment_created_at && (
            <span className="text-muted-foreground">on {formatDate(booking.latest_payment_created_at)}</span>
          )}
        </div>
      )}

      {/* Divider */}
      {booking.latest_payment_status && booking.pricing_source && <span className="text-border">•</span>}

      {/* Pricing Source */}
      {booking.pricing_source && (
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span className="text-muted-foreground">Pricing:</span>
          <span className="font-medium">{booking.pricing_source}</span>
        </div>
      )}

      {/* Divider */}
      {booking.pricing_source && booking.has_financial_snapshot !== undefined && <span className="text-border">•</span>}

      {/* Financial Snapshot */}
      {booking.has_financial_snapshot !== undefined && (
        <div className="flex items-center gap-2">
          {booking.has_financial_snapshot ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-muted-foreground">Financial:</span>
          <Badge variant={booking.has_financial_snapshot ? "success" : "neutral"} className="text-xs">
            {booking.has_financial_snapshot ? "Snapshot" : "No snapshot"}
          </Badge>
          {booking.financial_status && (
            <span className="text-muted-foreground text-xs">({booking.financial_status})</span>
          )}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <LoadingSkeleton variant="table" rows={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Return: Legs Table + Detalii */}
      {isReturn && legs.length > 0 && (
        <>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Return Trip Legs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Leg</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Scheduled</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Route</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Driver</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Vehicle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {legs.map((leg) => (
                    <tr key={leg.leg_number}>
                      <td className="px-4 py-3">
                        <Badge variant={leg.leg_role === "outbound" ? "info" : "warning"} className="text-xs">
                          {leg.leg_role === "outbound" ? "Outbound" : "Inbound"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(leg.scheduled_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="text-muted-foreground">{leg.pickup_address}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            <span className="text-muted-foreground">{leg.dropoff_address}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {leg.driver_name ? (
                          <div className="space-y-1 text-xs">
                            <div className="font-medium">{leg.driver_name}</div>
                            {leg.driver_phone && (
                              <div className="text-muted-foreground">{leg.driver_phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {leg.vehicle_plate ? (
                          <div className="space-y-1 text-xs">
                            <div className="font-mono font-medium">{leg.vehicle_plate}</div>
                            {leg.vehicle_make_model && (
                              <div className="text-muted-foreground">{leg.vehicle_make_model}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Detalii suplimentare SUB tabel */}
          <div className="border-t border-border pt-6">
            {renderAdditionalDetails()}
          </div>
        </>
      )}

      {/* Fleet: Slots Table + Detalii */}
      {isFleet && slots.length > 0 && (
        <>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Fleet Vehicles ({slots.length} slots)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Slot</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Requested Vehicle</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Driver</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Assigned Vehicle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {slots.map((slot) => (
                    <tr key={slot.slot_number}>
                      <td className="px-4 py-3">
                        <Badge variant="neutral" className="text-xs">
                          Slot {slot.slot_number}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={slot.slot_status === "ASSIGNED" ? "success" : "warning"}
                          className="text-xs"
                        >
                          {slot.slot_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs">
                          <div className="font-medium">{slot.requested_vehicle_category_label}</div>
                          {slot.requested_vehicle_model_label && (
                            <div className="text-muted-foreground">{slot.requested_vehicle_model_label}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {slot.driver_name ? (
                          <div className="space-y-1 text-xs">
                            <div className="font-medium">{slot.driver_name}</div>
                            {slot.driver_phone && (
                              <div className="text-muted-foreground">{slot.driver_phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {slot.vehicle_plate ? (
                          <div className="space-y-1 text-xs">
                            <div className="font-mono font-medium">{slot.vehicle_plate}</div>
                            {slot.vehicle_make_model && (
                              <div className="text-muted-foreground">{slot.vehicle_make_model}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Detalii suplimentare SUB tabel */}
          <div className="border-t border-border pt-6">
            {renderAdditionalDetails()}
          </div>
        </>
      )}

      {/* Pentru alte booking types (oneway, hourly, daily, bespoke): Doar detalii */}
      {!isReturn && !isFleet && renderAdditionalDetails()}
    </div>
  );
}
