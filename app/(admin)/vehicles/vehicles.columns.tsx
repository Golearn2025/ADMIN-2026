import { DataTableColumn } from "@/components/table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase,
  Car,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Trash2,
  Truck,
  User,
  Users,
} from "lucide-react";

export type Vehicle = {
  id: string;
  model_id: string;
  license_plate: string;
  year: number;
  color_id: string;
  status: string;
  driver_id?: string | null;
  driver_name?: string | null;
  category_id: string;
  organization_id: string;
  organization_name?: string;
  created_at: string;
  updated_at: string;
};

export type VehicleColumnHandlers = {
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onAssign?: (vehicle: Vehicle) => void;
  onViewDocuments?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
};

const MODEL_LABELS: Record<string, string> = {
  "bmw-7-series": "BMW 7 Series",
  "mercedes-s-class": "Mercedes S Class",
  "mercedes-e-class": "Mercedes E Class",
  "bmw-5-series": "BMW 5 Series",
  "range-rover": "Range Rover",
  "mercedes-v-class": "Mercedes V Class",
};

const CATEGORY_LABELS: Record<string, string> = {
  luxury: "Luxury",
  executive: "Executive",
  suv: "SUV",
  mpv: "MPV",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  maintenance: "destructive",
  available: "outline",
  pending: "secondary",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  maintenance: "Maintenance",
  available: "Available",
  pending: "Pending",
};

const COLORS: Record<string, string> = {
  black: "Black",
  white: "White",
  silver: "Silver",
  gray: "Gray",
  blue: "Blue",
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  orange: "Orange",
  brown: "Brown",
  champagne: "Champagne",
};

const getCategoryIcon = (category: string) => {
  const icons: Record<string, typeof Car> = {
    luxury: Car,
    executive: Briefcase,
    suv: Truck,
    mpv: Users,
  };
  const Icon = icons[category] || Car;
  return <Icon className="h-4 w-4 text-muted-foreground" />;
};

export function createColumns({
  onView,
  onEdit,
  onAssign,
  onViewDocuments,
  onDelete,
}: VehicleColumnHandlers): DataTableColumn<Vehicle>[] {
  return [
    {
      key: "model",
      header: "Model",
      cell: (row) => (
        <span className="text-sm font-medium">
          {MODEL_LABELS[row.model_id] || row.model_id}
        </span>
      ),
      width: "14%",
    },
    {
      key: "license",
      header: "License",
      cell: (row) => (
        <span className="font-mono text-sm font-medium">{row.license_plate}</span>
      ),
      width: "12%",
    },
    {
      key: "driver",
      header: "Driver",
      cell: (row) =>
        row.driver_name ? (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{row.driver_name}</span>
          </div>
        ) : (
          <Badge variant="outline" className="text-xs">
            Unassigned
          </Badge>
        ),
      width: "14%",
    },
    {
      key: "organization",
      header: "Organization",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.organization_name || "Unknown"}
        </span>
      ),
      width: "12%",
    },
    {
      key: "year",
      header: "Year",
      cell: (row) => <span className="text-sm">{row.year}</span>,
      width: "8%",
    },
    {
      key: "color",
      header: "Color",
      cell: (row) => (
        <span className="text-sm">{COLORS[row.color_id] || row.color_id}</span>
      ),
      width: "8%",
    },
    {
      key: "category",
      header: "Category",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getCategoryIcon(row.category_id)}
          <Badge variant="outline" className="text-xs">
            {CATEGORY_LABELS[row.category_id] || row.category_id}
          </Badge>
        </div>
      ),
      width: "12%",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant={STATUS_COLORS[row.status] || "secondary"}
          className="text-xs"
        >
          {STATUS_LABELS[row.status] || row.status}
        </Badge>
      ),
      width: "10%",
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={() => onView(row)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(row)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Vehicle
              </DropdownMenuItem>
            )}
            {onAssign && (
              <DropdownMenuItem onClick={() => onAssign(row)}>
                <User className="mr-2 h-4 w-4" />
                {row.driver_id ? "Reassign Driver" : "Assign Driver"}
              </DropdownMenuItem>
            )}
            {onViewDocuments && (
              <DropdownMenuItem onClick={() => onViewDocuments(row)}>
                <FileText className="mr-2 h-4 w-4" />
                View Documents
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(row)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Vehicle
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      width: "8%",
    },
  ];
}
