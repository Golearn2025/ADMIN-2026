"use client";

import { PageHeader } from "@/components/common/page-header";
import { DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Users } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { createColumns } from "./users.columns";
import type { TeamMember } from "./types";

const INVITE_ROLES = ["admin", "owner", "operator", "member"] as const;
type InviteRole = (typeof INVITE_ROLES)[number];

export default function TeamPage() {
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDeferredValue(searchValue);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          search: debouncedSearch,
          ...(roleFilter && { role: roleFilter }),
        });

        const response = await fetch(`/api/admin/users?${params}`);
        const result = await response.json();

        if (response.ok) {
          setUsers(result.data);
          setTotal(result.total);
        } else {
          console.error("Failed to fetch users:", result.error);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [page, pageSize, debouncedSearch, roleFilter, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleEditRole = async (member: TeamMember) => {
    const nextRole = window.prompt(
      `Edit role for ${member.email}\nAllowed: admin | owner | operator | member`,
      member.role
    );
    if (!nextRole) return;

    const role = nextRole.trim().toLowerCase();
    if (!INVITE_ROLES.includes(role as InviteRole)) {
      window.alert("Invalid role. Use admin, owner, operator, or member.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await response.json();
      if (!response.ok) {
        window.alert(result.error || "Failed to update role");
        return;
      }
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Edit role error:", error);
      window.alert("Failed to update role");
    }
  };

  const handleRemove = async (member: TeamMember) => {
    const confirmed = window.confirm(
      `Remove ${member.email} from this organization?`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/users/${member.id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(result.error || "Failed to remove member");
        return;
      }
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Remove member error:", error);
      window.alert("Failed to remove member");
    }
  };

  const handleResetPassword = async (member: TeamMember) => {
    try {
      const response = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.user_id, email: member.email }),
      });
      const result = await response.json();
      if (!response.ok) {
        window.alert(result.error || "Failed to generate reset link");
        return;
      }

      const link = result.action_link as string;
      const copied = await navigator.clipboard
        .writeText(link)
        .then(() => true)
        .catch(() => false);

      window.alert(
        copied
          ? `Password reset link copied to clipboard:\n\n${link}`
          : `Password reset link (copy manually):\n\n${link}`
      );
    } catch (error) {
      console.error("Reset password error:", error);
      window.alert("Failed to generate reset link");
    }
  };

  const columns = createColumns({
    onEditRole: handleEditRole,
    onRemove: handleRemove,
    onResetPassword: handleResetPassword,
  });

  const handleInvite = async () => {
    setInviteError(null);
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setInviteError("Enter a valid email address");
      return;
    }

    setInviteSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const result = await response.json();
      if (!response.ok) {
        setInviteError(result.error || "Failed to invite member");
        return;
      }

      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      setRefreshKey((k) => k + 1);
      if (result.warning) {
        window.alert(`Invited with note: ${result.warning}`);
      }
    } catch (error) {
      console.error("Invite error:", error);
      setInviteError("Failed to invite member");
    } finally {
      setInviteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Roles"
        subtitle="Manage team members and permissions"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        }
      />
      <div className="px-3 sm:px-4 md:px-6">
        <DataTableShell
          columns={columns}
          rows={users}
          totalRows={total}
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by email..."
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          emptyIcon={Users}
          emptyTitle="No team members found"
          emptyDescription="No team members match your search criteria."
        />
      </div>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteError(null);
            setInviteEmail("");
            setInviteRole("member");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviteSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as InviteRole)}
                disabled={inviteSubmitting}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteError ? (
              <p className="text-sm text-destructive">{inviteError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              disabled={inviteSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteSubmitting}>
              {inviteSubmitting ? "Inviting…" : "Send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
