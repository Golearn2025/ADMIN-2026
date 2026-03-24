"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";

export function Topbar() {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  useEffect(() => {
    const savedOrgId = localStorage.getItem('currentOrganizationId');
    setCurrentOrgId(savedOrgId);
  }, []);

  const handleOrganizationChange = (orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem('currentOrganizationId', orgId);
  };

  return (
    <div className="flex h-16 items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-primary">Vantage Lane</h1>
        <OrganizationSwitcher 
          currentOrgId={currentOrgId}
          onOrganizationChange={handleOrganizationChange}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
