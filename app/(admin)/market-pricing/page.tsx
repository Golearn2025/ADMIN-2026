"use client";

import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { BarChart3, Building2, Route, ClipboardList, History } from "lucide-react";
import { CompetitorsTab } from "./components/CompetitorsTab";
import { RoutesTab } from "./components/RoutesTab";
import { ChecksTab } from "./components/ChecksTab";
import { DashboardTab } from "./components/DashboardTab";

export default function MarketPricingPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Market Pricing"
        subtitle="Track competitor prices and analyse your position in the market."
      />
      <Tabs defaultValue="dashboard" className="flex flex-col flex-1 min-h-0">
        <div className="border-b border-border bg-card px-8">
          <TabsList className="h-12 bg-transparent p-0 gap-0">
            <TabsTrigger
              value="dashboard"
              className="flex items-center gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 text-muted-foreground data-[state=active]:text-foreground"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="checks"
              className="flex items-center gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 text-muted-foreground data-[state=active]:text-foreground"
            >
              <ClipboardList className="h-4 w-4" />
              Weekly Checks
            </TabsTrigger>
            <TabsTrigger
              value="routes"
              className="flex items-center gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 text-muted-foreground data-[state=active]:text-foreground"
            >
              <Route className="h-4 w-4" />
              Routes
            </TabsTrigger>
            <TabsTrigger
              value="competitors"
              className="flex items-center gap-2 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 text-muted-foreground data-[state=active]:text-foreground"
            >
              <Building2 className="h-4 w-4" />
              Competitors
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <TabsContent value="dashboard" className="m-0 h-full">
            <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
              <DashboardTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="checks" className="m-0 h-full">
            <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
              <ChecksTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="routes" className="m-0 h-full">
            <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
              <RoutesTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="competitors" className="m-0 h-full">
            <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
              <CompetitorsTab />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
