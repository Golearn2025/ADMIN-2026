import { Badge } from "@/components/common/badge";
import { formatDate } from "./bookings.utils";

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

interface ReturnLegsTableProps {
  legs: BookingLeg[];
}

export function ReturnLegsTable({ legs }: ReturnLegsTableProps) {
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
