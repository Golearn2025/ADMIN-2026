import { BookingActionsDropdown } from "@/components/bookings/booking-actions-dropdown";
import { Badge } from "@/components/common/badge";
import { DataTableColumn } from "@/components/table";
import {
    formatBookingType,
    formatDate,
    formatDuration,
    formatPrice,
    formatText,
    getBookingTypeColor,
    getPaymentBadgeVariant,
    getTripStatusBadgeVariant,
    getVehicleCategoryVariant,
} from "./bookings.utils";
import type { Booking } from "./types";

export const columns: DataTableColumn<Booking>[] = [
  {
    key: "reference",
    header: "Reference",
    cell: (row) => (
      <div className="space-y-1">
        <div className="font-mono text-xs">{row.reference}</div>
        <div className="text-xs text-muted-foreground">
          {formatDate(row.created_at)}
        </div>
      </div>
    ),
    width: "140px",
  },
  {
    key: "type",
    header: "Trip",
    cell: (row) => (
      <div className="space-y-1">
        <div className="text-xs font-semibold text-amber-500">
          {formatDate(row.scheduled_at)}
        </div>
        <div className={`text-xs font-medium ${getBookingTypeColor(row.booking_type)}`}>
          {formatBookingType(row.booking_type)}
        </div>
      </div>
    ),
    width: "140px",
  },
  {
    key: "customer",
    header: "Customer",
    cell: (row) => (
      <div className="space-y-1">
        <div className="font-medium text-sm">
          {row.customer_first_name} {row.customer_last_name}
        </div>
        <div className="text-xs text-muted-foreground">{row.customer_phone}</div>
      </div>
    ),
  },
  {
    key: "route",
    header: "Route",
    cell: (row) => {
      const isHourly = row.booking_type === "hourly";
      const isDaily = row.booking_type === "daily";
      const isFleet = row.booking_type === "fleet";

      return (
        <div className="space-y-2 text-xs">
          {!isHourly && !isDaily && (
            <>
              <div className="flex items-start gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{row.pickup_address}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{row.dropoff_address}</span>
              </div>
              <div className="flex gap-2 text-xs pt-1">
                <span className="text-blue-500">{row.distance_miles} mi</span>
                {row.duration_min && (
                  <span className="text-amber-500">{formatDuration(row.duration_min)}</span>
                )}
              </div>
            </>
          )}
          {isHourly && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-blue-500">{row.booked_hours}h booking</span>
            </div>
          )}
          {isDaily && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-amber-500">{row.booked_days} {row.booked_days === 1 ? 'day' : 'days'} booking</span>
            </div>
          )}
        </div>
      );
    },
  },
  {
    key: "vehicle",
    header: "Vehicle",
    cell: (row) => {
      return (
        <div className="space-y-1 text-xs">
          <Badge variant={getVehicleCategoryVariant(row.requested_vehicle_category_label)} className="text-xs">
            {row.requested_vehicle_category_label || "N/A"}
          </Badge>
          {row.requested_vehicle_display && (
            <div className="text-muted-foreground">
              {row.requested_vehicle_display}
            </div>
          )}
          {row.booking_type === "fleet" && row.fleet_size > 0 && (
            <div className="text-blue-500 font-semibold">
              {row.fleet_size} vehicles
            </div>
          )}
        </div>
      );
    },
  },
  {
    key: "driver",
    header: "Driver",
    cell: (row) => (
      <div className="flex flex-col items-center space-y-1 text-xs">
        <div className="font-medium">{row.driver_name || "Unassigned"}</div>
        {row.vehicle_plate && (
          <div className="font-mono text-gray-500">
            {row.vehicle_plate}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Trip Status",
    cell: (row) => (
      <div className="flex justify-center">
        <Badge variant={getTripStatusBadgeVariant(row.trip_status)} className="text-xs">
          {formatText(row.trip_status)}
        </Badge>
      </div>
    ),
    width: "130px",
  },
  {
    key: "payment",
    header: "Payment",
    cell: (row) => (
      <div className="flex flex-col items-center space-y-1">
        <div className="font-medium text-xs">
          {formatPrice(row.display_price_pence, row.latest_payment_currency)}
        </div>
        {row.latest_payment_status && (
          <Badge variant={getPaymentBadgeVariant(row.latest_payment_status)} className="text-xs">
            {formatText(row.latest_payment_status)}
          </Badge>
        )}
      </div>
    ),
    width: "120px",
  },
  {
    key: "actions",
    header: "",
    cell: (row) => <BookingActionsDropdown booking={row} />,
    width: "48px",
  },
];
