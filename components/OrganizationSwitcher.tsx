"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Organization {
  id: string;
  name: string;
  org_type: string;
  is_active: boolean;
  is_default: boolean;
  member_count: number;
}

interface OrganizationSwitcherProps {
  currentOrgId?: string | null;
  onOrganizationChange?: (orgId: string) => void;
}

export const OrganizationSwitcher = memo(function OrganizationSwitcher({ 
  currentOrgId, 
  onOrganizationChange 
}: OrganizationSwitcherProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // ✅ useCallback WITHOUT dependencies - prevent re-fetch
  const fetchOrganizations = useCallback(async () => {
    try {
      console.log('OrganizationSwitcher: Fetching organizations...');
      
      // Add organization header to API calls
      const headers: HeadersInit = {};
      if (currentOrgId) {
        headers['x-organization-id'] = currentOrgId;
      }
      
      const response = await fetch('/api/admin/organizations', { headers });
      const data = await response.json();
      
      console.log('OrganizationSwitcher: Response:', { ok: response.ok, data });
      
      if (response.ok) {
        setOrganizations(data.organizations || []);
        setIsSuperAdmin(data.isSuperAdmin || false);
        console.log('OrganizationSwitcher: Organizations loaded:', data.organizations?.length, 'isSuperAdmin:', data.isSuperAdmin);
      } else {
        console.error('OrganizationSwitcher: API error:', data.error);
      }
    } catch (error) {
      console.error('OrganizationSwitcher: Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ EMPTY deps - stable function

  // Fetch organizations - ONLY ONCE
  useEffect(() => {
    fetchOrganizations();
  }, []); // ✅ EMPTY deps - fetch only once

  const getCurrentOrganization = () => {
    if (currentOrgId === "ALL") return null;
    return organizations.find(org => org.id === currentOrgId);
  };

  const handleSwitchOrganization = async (orgId: string) => {
    try {
      // Update organization context in backend (user_context table)
      const response = await fetch('/api/auth/switch-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!response.ok) {
        console.error('Failed to switch organization');
        return;
      }

      // Update localStorage
      if (onOrganizationChange) {
        onOrganizationChange(orgId);
      }

      // Refresh page to apply new organization context
      window.location.reload();
    } catch (error) {
      console.error('Error switching organization:', error);
    }
  };

  const handleAddOrganization = () => {
    // Navigate to organizations page with add modal open
    window.location.href = '/organizations';
  };

  const currentOrg = getCurrentOrganization();

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Building2 className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  // ✅ REMOVED DEBUG LOG - causing hook order issues
  // console.log('OrganizationSwitcher:', { 
  //   isSuperAdmin, 
  //   orgCount: organizations.length, 
  //   currentOrgId,
  //   organizations: organizations.map(o => o.name)
  // });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-[220px] justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate font-medium">
              {currentOrgId === "ALL" ? "All Organizations" : currentOrg ? currentOrg.name : "Select Organization"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px]">
        {/* Header */}
        <div className="px-3 py-2 border-b">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {isSuperAdmin ? "Super Admin View" : "Your Organization"}
          </div>
          {(currentOrg || currentOrgId === "ALL") && (
            <div className="mt-1">
              <div className="font-medium text-sm">
                {currentOrgId === "ALL" ? "All Organizations" : currentOrg?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentOrgId === "ALL" 
                  ? `Viewing ${organizations.length} organizations`
                  : `${currentOrg?.member_count || 0} members`
                }
              </div>
            </div>
          )}
        </div>

        {/* ALL Organizations option for Super Admin */}
        {isSuperAdmin && (
          <>
            <div className="px-3 py-1.5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Switch View
              </div>
            </div>
            <DropdownMenuItem
              key="ALL"
              onClick={() => handleSwitchOrganization("ALL")}
              className={`mx-2 mb-1 rounded-md p-2.5 ${currentOrgId === "ALL" ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <div>
                    <div className="font-medium text-sm">All Organizations</div>
                    <div className="text-xs opacity-80">
                      View all data across {organizations.length} organizations
                    </div>
                  </div>
                </div>
                {currentOrgId === "ALL" && (
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                )}
              </div>
            </DropdownMenuItem>
            <div className="px-3 py-1.5 border-t">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Organizations
              </div>
            </div>
          </>
        )}

        {/* All Organizations */}
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitchOrganization(org.id)}
            className={`mx-2 mb-1 rounded-md p-2.5 ${
              currentOrgId === org.id ? 'bg-primary text-primary-foreground' : ''
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <div>
                  <div className="font-medium text-sm">{org.name}</div>
                  <div className="text-xs opacity-80">
                    {org.member_count || 0} members • {org.org_type || 'Standard'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {currentOrgId === org.id && (
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                )}
                {org.is_default && currentOrgId !== org.id && (
                  <Badge variant="outline" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
            </div>
          </DropdownMenuItem>
        ))}

        {/* Add New Organization */}
        {isSuperAdmin && (
          <>
            <div className="border-t my-1" />
            <DropdownMenuItem
              onClick={handleAddOrganization}
              className="mx-2 mb-2 rounded-md p-2.5 text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="font-medium">Add New Organization</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
