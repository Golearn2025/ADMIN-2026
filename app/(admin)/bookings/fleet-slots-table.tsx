import { Badge } from "@/components/common/badge";

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

interface FleetSlotsTableProps {
  slots: FleetSlot[];
}

export function FleetSlotsTable({ slots }: FleetSlotsTableProps) {
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
