"use client";

import { useState, useEffect } from "react";
import { Menu, User } from "lucide-react";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";

export function Topbar() {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const savedOrgId = localStorage.getItem('currentOrganizationId');
    setCurrentOrgId(savedOrgId);
  }, []);

  const handleOrganizationChange = (orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem('currentOrganizationId', orgId);
  };

  return (
  <>
    <div className="flex h-16 items-center justify-between gap-2 px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Deschide meniul"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-base font-semibold text-primary md:text-lg">Vantage Lane</h1>
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
    <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
  </>
  );
}
