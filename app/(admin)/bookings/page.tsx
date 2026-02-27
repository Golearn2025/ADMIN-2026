"use client";

import { Badge } from "@/components/common/badge";
import { PageHeader } from "@/components/common/page-header";
import { DataTableColumn, DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface Booking {
  id: string;
  reference: string;
  status: string;
  booking_type: string;
  scheduled_at: string;
  created_at: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email?: string;
  pickup_address: string;
  dropoff_address: string;
  distance_miles: number;
  duration_min: number | null;
  requested_vehicle_category_label: string;
  requested_vehicle_model_label?: string;
  driver_name?: string;
  vehicle_plate?: string;
  display_price_pence: number;
  latest_payment_currency: string;
  latest_payment_status?: string;
}

const getStatusBadgeVariant = (status: string) => {
  const statusMap: Record<string, "success" | "warning" | "error" | "neutral" | "primary"> = {
    completed: "success",
    confirmed: "success",
    in_progress: "primary",
    pending: "warning",
    cancelled: "error",
    failed: "error",
  };
  return statusMap[status.toLowerCase()] || "neutral";
};

const getPaymentBadgeVariant = (status?: string) => {
  if (!status) return "neutral";
  const statusMap: Record<string, "success" | "warning" | "error" | "neutral"> = {
    paid: "success",
    succeeded: "success",
    pending: "warning",
    processing: "warning",
    failed: "error",
    refunded: "neutral",
  };
  return statusMap[status.toLowerCase()] || "neutral";
};

const formatPrice = (pence: number, currency: string) => {
  const amount = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (minutes: number | null) => {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const getBookingTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    oneway: "text-blue-500",
    return: "text-green-500",
    fleet: "text-gray-500",
    book_by_day: "text-amber-500",
    book_by_hour: "text-orange-500",
    bespoke: "text-red-500",
  };
  return colorMap[type.toLowerCase()] || "text-gray-500";
};

const formatBookingType = (type: string) => {
  return type
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatText = (text: string) => {
  return text
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getVehicleCategoryVariant = (category: string | null | undefined) => {
  if (!category) return "neutral";
  const variantMap: Record<string, "neutral" | "primary" | "purple" | "dark"> = {
    executive: "neutral",
    luxury: "primary",
    suv: "purple",
    mpv: "dark",
  };
  return variantMap[category.toLowerCase()] || "neutral";
};

const columns: DataTableColumn<Booking>[] = [
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
    cell: (row) => (
      <div className="max-w-xs space-y-1 text-xs">
        <div className="flex items-start gap-1 truncate">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />
          <span className="truncate">{row.pickup_address}</span>
        </div>
        <div className="flex items-start gap-1 truncate">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 mt-1 flex-shrink-0" />
          <span className="truncate">{row.dropoff_address}</span>
        </div>
        <div className="flex gap-2 text-xs font-medium">
          <span className="text-blue-500">{row.distance_miles} mi</span>
          {row.duration_min && (
            <span className="text-amber-500">{formatDuration(row.duration_min)}</span>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "vehicle",
    header: "Vehicle",
    cell: (row) => (
      <div className="space-y-1 text-xs">
        <Badge variant={getVehicleCategoryVariant(row.requested_vehicle_category_label)} className="text-xs">
          {row.requested_vehicle_category_label || "N/A"}
        </Badge>
        {row.requested_vehicle_model_label && (
          <div className="text-muted-foreground">
            {row.requested_vehicle_model_label}
          </div>
        )}
      </div>
    ),
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
    header: "Status",
    cell: (row) => (
      <div className="flex justify-center">
        <Badge variant={getStatusBadgeVariant(row.status)} className="text-xs">
          {formatText(row.status)}
        </Badge>
      </div>
    ),
    width: "110px",
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
];

export default function BookingsPage() {
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          search: searchValue,
        });

        const response = await fetch(`/api/admin/bookings?${params}`);
        const result = await response.json();

        if (response.ok) {
          setBookings(result.data);
          setTotal(result.total);
        } else {
          console.error("Failed to fetch bookings:", result.error);
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [page, pageSize, searchValue]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle="Manage all transportation bookings"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        }
      />
      <div className="px-6">
        <DataTableShell
          columns={columns}
          rows={bookings}
          totalRows={total}
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by reference, customer name or phone..."
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          emptyIcon={Calendar}
          emptyTitle="No bookings found"
          emptyDescription="No bookings match your search criteria."
        />
      </div>
    </div>
  );
}
