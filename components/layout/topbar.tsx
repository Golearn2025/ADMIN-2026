"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { Button } from "@/components/ui/button";
import { AdminNotificationBell } from "./admin-notification-bell";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export function Topbar() {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const savedOrgId = localStorage.getItem("currentOrganizationId");
    setCurrentOrgId(savedOrgId);
  }, []);

  const handleOrganizationChange = (orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem("currentOrganizationId", orgId);
  };

  return (
    <>
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 md:gap-4">
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
          <h1 className="hidden truncate text-base font-semibold text-primary sm:inline sm:text-lg">
            Vantage Lane
          </h1>
          <div className="min-w-0 flex-1 md:flex-none md:max-w-[280px]">
            <OrganizationSwitcher
              currentOrgId={currentOrgId}
              onOrganizationChange={handleOrganizationChange}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <AdminNotificationBell />
          <UserMenu />
        </div>
      </div>
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
