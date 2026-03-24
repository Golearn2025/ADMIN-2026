"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, Users, Settings, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrganizationsTable } from "./components/OrganizationsTable";
import { AddOrganizationModal } from "./components/AddOrganizationModal";

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

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Fetch organizations
  const fetchOrganizations = async () => {
    try {
      console.log('OrganizationsPage: Fetching organizations...');
      const response = await fetch('/api/admin/organizations');
      const data = await response.json();
      
      console.log('OrganizationsPage: Response:', { ok: response.ok, data });
      
      if (response.ok) {
        setOrganizations(data.organizations || []);
        setIsSuperAdmin(data.isSuperAdmin || false);
        console.log('OrganizationsPage: Loaded', data.organizations?.length, 'organizations, isSuperAdmin:', data.isSuperAdmin);
      } else {
        console.error('OrganizationsPage: Error:', data.error);
        alert('Failed to fetch organizations: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('OrganizationsPage: Fetch error:', error);
      alert('Error fetching organizations');
    } finally {
      setLoading(false);
    }
  };

  // Handle add organization
  const handleAddOrganization = (orgData: any) => {
    setAddModalOpen(false);
    fetchOrganizations(); // Refresh list
  };

  // Calculate statistics
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(org => org.is_active).length;
  const totalMembers = organizations.reduce((sum, org) => sum + (Number(org.member_count) || 0), 0);
  const orgTypes = [...new Set(organizations.map(org => org.org_type))];

  useEffect(() => {
    fetchOrganizations();
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Organizations"
          subtitle="Manage organization settings and structure"
          actions={
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          }
        />
        <div className="flex items-center justify-center py-12">
          <Building2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle="Manage organization settings and structure"
        actions={
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </Button>
        }
      />

      <div className="space-y-4 md:space-y-6">
        {/* Statistics Cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="text-center space-y-1 md:space-y-2">
                <div className="flex justify-center">
                  <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">
                    Total Organizations
                  </p>
                  <p className="text-2xl md:text-3xl font-bold">{totalOrgs}</p>
                  <p className="text-xs text-muted-foreground">registered</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="text-center space-y-1 md:space-y-2">
                <div className="flex justify-center">
                  <Settings className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">
                    Active
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-green-500">{activeOrgs}</p>
                  <p className="text-xs text-muted-foreground">organizations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="text-center space-y-1 md:space-y-2">
                <div className="flex justify-center">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">
                    Total Members
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-blue-500">{totalMembers}</p>
                  <p className="text-xs text-muted-foreground">users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="text-center space-y-1 md:space-y-2">
                <div className="flex justify-center">
                  <Building2 className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">
                    Organization Types
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-purple-500">{orgTypes.length}</p>
                  <p className="text-xs text-muted-foreground">types</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organizations Table */}
        <OrganizationsTable 
          organizations={organizations}
          onRefresh={fetchOrganizations}
          isSuperAdmin={isSuperAdmin}
        />
      </div>

      {/* Add Organization Modal */}
      <AddOrganizationModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={handleAddOrganization}
      />
    </div>
  );
}
