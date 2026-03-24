"use client";

import { useState } from "react";
import { Building2, MoreHorizontal, Users, Settings, Trash2, Eye, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Organization {
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
}

interface OrganizationsTableProps {
  organizations: Organization[];
  onRefresh: () => void;
  isSuperAdmin: boolean;
}

const ORG_TYPE_LABELS: { [key: string]: string } = {
  saas: "SaaS",
  operator: "Operator",
  customer: "Customer"
};

const ROLE_LABELS: { [key: string]: string } = {
  root: "Admin",
  operator: "Operator",
  admin: "Admin"
};

export function OrganizationsTable({ 
  organizations, 
  onRefresh, 
  isSuperAdmin 
}: OrganizationsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter organizations
  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.members.some(m => m.auth_users.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === "all" || org.org_type === typeFilter;
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && org.is_active) ||
      (statusFilter === "inactive" && !org.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchTerm || typeFilter !== "all" || statusFilter !== "all";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const handleViewOrganization = (org: Organization) => {
    alert(`View ${org.name} details coming soon`);
  };

  const handleEditOrganization = (org: Organization) => {
    alert(`Edit ${org.name} coming soon`);
  };

  const handleDeleteOrganization = (org: Organization) => {
    if (confirm(`Are you sure you want to delete ${org.name}?`)) {
      alert(`Delete ${org.name} coming soon`);
    }
  };

  const uniqueTypes = [...new Set(organizations.map(org => org.org_type))];
  const activeCount = organizations.filter(org => org.is_active).length;
  const inactiveCount = organizations.filter(org => !org.is_active).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Organizations ({filteredOrganizations.length} total)
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 min-w-full sm:min-w-[200px]">
            <Input
              placeholder="Search by name or member email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {ORG_TYPE_LABELS[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active ({activeCount})</SelectItem>
              <SelectItem value="inactive">Inactive ({inactiveCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Organization</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Members</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizations.map((org) => (
                <tr key={org.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{org.name}</p>
                        {org.is_default && (
                          <p className="text-xs text-muted-foreground">Default Organization</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {ORG_TYPE_LABELS[org.org_type] || org.org_type}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{Number(org.member_count) || 0}</span>
                      <span className="text-xs text-muted-foreground">members</span>
                    </div>
                    {(Number(org.member_count) || 0) > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {org.members.filter(m => m.role === 'root').length} admin(s)
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge 
                      variant={org.is_active ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {org.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(org.created_at)}
                    </span>
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewOrganization(org)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {isSuperAdmin && (
                          <DropdownMenuItem onClick={() => handleEditOrganization(org)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Organization
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleViewOrganization(org)}>
                          <Users className="h-4 w-4 mr-2" />
                          Manage Members
                        </DropdownMenuItem>
                        {isSuperAdmin && !org.is_default && (
                          <DropdownMenuItem 
                            onClick={() => handleDeleteOrganization(org)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Organization
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredOrganizations.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No organizations found</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
