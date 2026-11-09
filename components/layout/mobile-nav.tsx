"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useMessagesUnreadBadge } from "@/lib/features/communications";
import { bottomNavItems, navConfig } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { unread } = useMessagesUnreadBadge();

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        aria-label="Închide meniul"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col border-r border-border bg-card shadow-xl lg:hidden">
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold text-primary">Admin</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Închide">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {navConfig.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{group.title}</span>
                {group.title === "Communications" && unread > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-destructive-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const badge =
                    item.href === "/communications/messages" && unread > 0
                      ? unread > 99
                        ? "99+"
                        : String(unread)
                      : item.badge;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {badge && (
                        <span className="rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-4 border-t border-border pt-4">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}
