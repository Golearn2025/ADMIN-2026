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
  Building2,
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  Users,
} from "lucide-react";

export type Organization = {
  id: string;
  name: string;
  org_type: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  members: Array<{
    user_id: string;
    role: string;
    auth_users: {
      email: string;
    };
  }>;
  member_count: number;
};

export type OrganizationColumnHandlers = {
  onView: (org: Organization) => void;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
  isSuperAdmin: boolean;
};

const ORG_TYPE_LABELS: Record<string, string> = {
  saas: "SaaS",
  operator: "Operator",
  customer: "Customer",
  partner: "Partner",
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-GB");

export function createColumns({
  onView,
  onEdit,
  onDelete,
  isSuperAdmin,
}: OrganizationColumnHandlers): DataTableColumn<Organization>[] {
  return [
    {
      key: "organization",
      header: "Organization",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{row.name}</p>
            {row.is_default && (
              <p className="text-xs text-muted-foreground">
                Default Organization
              </p>
            )}
          </div>
        </div>
      ),
      width: "28%",
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className="text-xs">
          {ORG_TYPE_LABELS[row.org_type] || row.org_type}
        </Badge>
      ),
      width: "12%",
    },
    {
      key: "members",
      header: "Members",
      cell: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {Number(row.member_count) || 0}
            </span>
            <span className="text-xs text-muted-foreground">members</span>
          </div>
          {(Number(row.member_count) || 0) > 0 && (
            <div className="text-xs text-muted-foreground">
              {row.members.filter((m) => m.role === "root").length} admin(s)
            </div>
          )}
        </div>
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
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
      width: "12%",
    },
    {
      key: "created",
      header: "Created",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.created_at)}
        </span>
      ),
      width: "12%",
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
            {isSuperAdmin && (
              <DropdownMenuItem onClick={() => onEdit(row)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Organization
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onView(row)}>
              <Users className="mr-2 h-4 w-4" />
              Manage Members
            </DropdownMenuItem>
            {isSuperAdmin && !row.is_default && (
              <DropdownMenuItem
                onClick={() => onDelete(row)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Organization
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      width: "10%",
    },
  ];
}
