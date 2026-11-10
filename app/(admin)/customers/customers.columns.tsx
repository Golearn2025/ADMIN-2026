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
  Edit,
  Eye,
  KeyRound,
  Mail,
  MoreHorizontal,
  Phone,
  UserCheck,
  UserX,
} from "lucide-react";

export type Customer = {
  customer_id: string;
  auth_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  profile_photo_url: string | null;
  saved_address: unknown;
  is_active: boolean;
  organization_id: string;
  organization_name?: string;
  customer_created_at: string;
  customer_updated_at: string;
  temperature_preference: string | null;
  music_preference: string | null;
  communication_style: string | null;
  pet_friendly_default: boolean | null;
};

export type CustomerColumnHandlers = {
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onEmail: (customer: Customer) => void;
  onCall: (customer: Customer) => void;
  onToggleStatus: (customer: Customer) => void;
  onResetPassword: (customer: Customer) => void;
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-GB");
};

export function createColumns({
  onView,
  onEdit,
  onEmail,
  onCall,
  onToggleStatus,
  onResetPassword,
}: CustomerColumnHandlers): DataTableColumn<Customer>[] {
  return [
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.profile_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.profile_photo_url}
              alt={`${row.first_name} ${row.last_name}`}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-medium text-primary">
                {row.first_name?.[0]}
                {row.last_name?.[0]}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium">
              {row.first_name} {row.last_name}
            </p>
            {row.date_of_birth && (
              <p className="text-xs text-muted-foreground">
                DOB: {formatDate(row.date_of_birth)}
              </p>
            )}
          </div>
        </div>
      ),
      width: "22%",
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => <span className="text-sm">{row.email}</span>,
      width: "18%",
    },
    {
      key: "phone",
      header: "Phone",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.phone || "N/A"}
        </span>
      ),
      width: "12%",
    },
    {
      key: "organization",
      header: "Organization",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.organization_name || "Unknown"}
        </span>
      ),
      width: "14%",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant={row.is_active ? "default" : "secondary"}
          className="text-xs"
        >
          {row.is_active ? (
            <>
              <UserCheck className="mr-1 h-3 w-3" /> Active
            </>
          ) : (
            <>
              <UserX className="mr-1 h-3 w-3" /> Inactive
            </>
          )}
        </Badge>
      ),
      width: "12%",
    },
    {
      key: "joined",
      header: "Joined",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.customer_created_at)}
        </span>
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
            <DropdownMenuItem onClick={() => onView(row)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(row)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Customer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onResetPassword(row)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Reset password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEmail(row)}>
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </DropdownMenuItem>
            {row.phone && (
              <DropdownMenuItem onClick={() => onCall(row)}>
                <Phone className="mr-2 h-4 w-4" />
                Call Customer
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onToggleStatus(row)}>
              {row.is_active ? (
                <>
                  <UserX className="mr-2 h-4 w-4" /> Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" /> Activate
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      width: "8%",
    },
  ];
}
