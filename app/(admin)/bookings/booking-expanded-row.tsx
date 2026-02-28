import { useEffect, useState } from "react";
import { Badge } from "@/components/common/badge";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import type { Booking } from "./types";
import { formatDate } from "./bookings.utils";

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

export function BookingExpandedRow({ booking }: BookingExpandedRowProps) {
  const [legs, setLegs] = useState<BookingLeg[]>([]);
  const [slots, setSlots] = useState<FleetSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isReturn = booking.booking_type === "return";
  const isFleet = booking.booking_type === "fleet";

  useEffect(() => {
    const fetchData = async () => {
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

  if (isLoading) {
    return (
      <div className="py-4">
        <LoadingSkeleton variant="table" rows={2} />
      </div>
    );
  }

  if (isReturn && legs.length > 0) {
    return (
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
    );
  }

  if (isFleet && slots.length > 0) {
    return (
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
    );
  }

  return (
    <div className="py-4 text-sm text-muted-foreground">
      No additional details available.
    </div>
  );
}
