"use client";

import Link from "next/link";
import {
  Bell,
  BellOff,
  Briefcase,
  Megaphone,
  MessageSquare,
} from "lucide-react";
import { useAdminAlerts } from "@/lib/features/admin-alerts";
import { useMessagesUnreadBadge } from "@/lib/features/communications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatWhen(at: number) {
  try {
    return new Date(at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Topbar bell — badge from SSOT unread (+ job alerts).
 * Opening Messages marks read → badge + message alerts clear together.
 */
export function AdminNotificationBell() {
  const { unread: inboxUnread } = useMessagesUnreadBadge();
  const {
    alerts,
    muted,
    toggleMute,
    testSound,
    jobAlertCount,
    clearMessageAlerts,
    dismissAlert,
  } = useAdminAlerts();

  // Badge = real unread messages + undismissed job pings (not sticky session history)
  const badgeCount = inboxUnread + jobAlertCount;
  const badge =
    badgeCount > 99 ? "99+" : badgeCount > 0 ? String(badgeCount) : null;

  // If inbox is fully read, hide stale message alerts from the list too
  const listAlerts =
    inboxUnread === 0
      ? alerts.filter((a) => a.kind === "job")
      : alerts;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        // Opening bell while already caught up: drop stale message rows
        if (open && inboxUnread === 0) clearMessageAlerts();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={
            badgeCount > 0
              ? `Notifications, ${badgeCount} alerts`
              : "Notifications"
          }
        >
          {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {badge && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground">
              {badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-start justify-between gap-2 font-normal">
          <div>
            <div className="text-sm font-medium">Alerts</div>
            <div className="text-xs text-muted-foreground">
              {inboxUnread > 0
                ? `${inboxUnread} unread message${inboxUnread === 1 ? "" : "s"}`
                : jobAlertCount > 0
                  ? `${jobAlertCount} new job${jobAlertCount === 1 ? "" : "s"}`
                  : "All caught up"}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                testSound();
              }}
            >
              Test
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                toggleMute();
              }}
            >
              {muted ? "Unmute" : "Mute"}
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {listAlerts.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No open alerts. Open Messages to clear chat badges; job alerts clear
            when you open them.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {listAlerts.slice(0, 12).map((a) => (
              <DropdownMenuItem key={a.id} asChild>
                <Link
                  href={a.href}
                  className="cursor-pointer items-start gap-2"
                  onClick={() => {
                    if (a.kind === "message") clearMessageAlerts();
                    else dismissAlert(a.id);
                  }}
                >
                  {a.kind === "job" ? (
                    <Briefcase className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {a.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.body}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatWhen(a.at)}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/communications/messages"
            className="cursor-pointer"
            onClick={() => {
              if (inboxUnread === 0) clearMessageAlerts();
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            <span className="flex-1">Messages</span>
            {inboxUnread > 0 && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                {inboxUnread > 99 ? "99+" : inboxUnread}
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/communications/notifications" className="cursor-pointer">
            <Megaphone className="mr-2 h-4 w-4" />
            Notifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/bookings" className="cursor-pointer">
            <Briefcase className="mr-2 h-4 w-4" />
            All Bookings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
