import { DataTableColumn } from "@/components/table/data-table";
import { Badge } from "@/components/ui/badge";
import { TeamMember } from "./types";

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "root":
      return "destructive";
    case "owner":
      return "default";
    case "admin":
      return "secondary";
    case "operator":
      return "outline";
    default:
      return "outline";
  }
};

export const columns: DataTableColumn<TeamMember>[] = [
  {
    key: "email",
    header: "Email",
    cell: (row) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{row.email}</span>
        <span className="text-xs text-muted-foreground">ID: {row.user_id.slice(0, 8)}...</span>
      </div>
    ),
    width: "30%",
  },
  {
    key: "role",
    header: "Role",
    cell: (row) => (
      <Badge variant={getRoleBadgeVariant(row.role)}>
        {row.role.toUpperCase()}
      </Badge>
    ),
    width: "15%",
  },
  {
    key: "last_sign_in",
    header: "Last Sign In",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {row.last_sign_in_at
          ? formatTimeAgo(row.last_sign_in_at)
          : "Never"}
      </span>
    ),
    width: "20%",
  },
  {
    key: "created_at",
    header: "Added",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {formatTimeAgo(row.created_at)}
      </span>
    ),
    width: "20%",
  },
  {
    key: "actions",
    header: "Actions",
    cell: (row) => (
      <div className="flex items-center gap-2">
        <button className="text-xs text-primary hover:underline">
          Edit Role
        </button>
        <button className="text-xs text-destructive hover:underline">
          Remove
        </button>
      </div>
    ),
    width: "15%",
  },
];
