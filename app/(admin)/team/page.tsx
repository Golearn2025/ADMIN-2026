"use client";

import { PageHeader } from "@/components/common/page-header";
import { DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import { UserPlus, Users } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { columns } from "./users.columns";
import type { TeamMember } from "./types";

export default function TeamPage() {
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDeferredValue(searchValue);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");

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
  }, [page, pageSize, debouncedSearch, roleFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Roles"
        subtitle="Manage team members and permissions"
        actions={
          <Button>
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        }
      />
      <div className="px-6">
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
    </div>
  );
}
