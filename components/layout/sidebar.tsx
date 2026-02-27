"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { bottomNavItems, navConfig } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold text-primary">Admin</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {sidebarCollapsed ? (
          <div className="space-y-4">
            {navConfig.map((group) => (
              <div key={group.title} className="space-y-1">
                {group.icon && (
                  <div className="flex h-10 w-10 items-center justify-center">
                    <group.icon className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="h-px bg-border" />
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      title={item.title}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {navConfig.map((group, index) => {
              if (group.items.length === 1) {
                const item = group.items[0];
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{item.title}</span>
                  </Link>
                );
              }

              return (
                <Accordion key={group.title} type="multiple">
                  <AccordionItem value={`group-${index}`} className="border-none">
                    <AccordionTrigger className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
                      <div className="flex items-center gap-2">
                        {group.icon && <group.icon className="h-5 w-5 flex-shrink-0 text-primary" />}
                        <span>{group.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1.5 pb-3 pt-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <span className="flex-1">{item.title}</span>
                            {item.badge && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-border p-2">
        {sidebarCollapsed ? (
          <div className="space-y-2">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={item.title}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.title}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
