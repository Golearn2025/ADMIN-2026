"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Building2, Plus, Settings, Users } from "lucide-react";
import { PageHeader } from "@/components/common";
import { DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddOrganizationModal } from "./components/AddOrganizationModal";
import {
  createColumns,
  type Organization,
} from "./organizations.columns";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDeferredValue(searchValue);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/organizations");
      const data = await response.json();

      if (response.ok) {
        setOrganizations(data.organizations || []);
        setIsSuperAdmin(data.isSuperAdmin || false);
      } else {
        console.error("Failed to fetch organizations:", data.error);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((org) => org.is_active).length;
  const totalMembers = organizations.reduce(
    (sum, org) => sum + (Number(org.member_count) || 0),
    0
  );
  const orgTypes = [...new Set(organizations.map((org) => org.org_type))];

  const filteredOrganizations = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.org_type.toLowerCase().includes(q) ||
        org.members.some((m) =>
          m.auth_users?.email?.toLowerCase().includes(q)
        )
    );
  }, [organizations, debouncedSearch]);

  const pagedOrganizations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrganizations.slice(start, start + pageSize);
  }, [filteredOrganizations, page, pageSize]);

  const columns = createColumns({
    isSuperAdmin,
    onView: (org) => alert(`View ${org.name} details coming soon`),
    onEdit: (org) => alert(`Edit ${org.name} coming soon`),
    onDelete: (org) => {
      if (confirm(`Are you sure you want to delete ${org.name}?`)) {
        alert(`Delete ${org.name} coming soon`);
      }
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        subtitle="Manage organization settings and structure"
        actions={
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Organization
          </Button>
        }
      />

      <div className="space-y-4 px-3 sm:px-4 md:px-6 md:space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-1 text-center md:space-y-2">
                <div className="flex justify-center">
                  <Building2 className="h-6 w-6 text-primary md:h-8 md:w-8" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground md:text-sm">
                    Total Organizations
                  </p>
                  <p className="text-2xl font-bold md:text-3xl">{totalOrgs}</p>
                  <p className="text-xs text-muted-foreground">registered</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-1 text-center md:space-y-2">
                <div className="flex justify-center">
                  <Settings className="h-6 w-6 text-green-500 md:h-8 md:w-8" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground md:text-sm">
                    Active
                  </p>
                  <p className="text-2xl font-bold text-green-500 md:text-3xl">
                    {activeOrgs}
                  </p>
                  <p className="text-xs text-muted-foreground">organizations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-1 text-center md:space-y-2">
                <div className="flex justify-center">
                  <Users className="h-6 w-6 text-blue-500 md:h-8 md:w-8" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground md:text-sm">
                    Total Members
                  </p>
                  <p className="text-2xl font-bold text-blue-500 md:text-3xl">
                    {totalMembers}
                  </p>
                  <p className="text-xs text-muted-foreground">users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-1 text-center md:space-y-2">
                <div className="flex justify-center">
                  <Building2 className="h-6 w-6 text-purple-500 md:h-8 md:w-8" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground md:text-sm">
                    Organization Types
                  </p>
                  <p className="text-2xl font-bold text-purple-500 md:text-3xl">
                    {orgTypes.length}
                  </p>
                  <p className="text-xs text-muted-foreground">types</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DataTableShell
          columns={columns}
          rows={pagedOrganizations}
          totalRows={filteredOrganizations.length}
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by name or member email..."
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          emptyIcon={Building2}
          emptyTitle="No organizations found"
          emptyDescription="No organizations match your search criteria."
        />
      </div>

      <AddOrganizationModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => {
          setAddModalOpen(false);
          fetchOrganizations();
        }}
      />
    </div>
  );
}
