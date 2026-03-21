"use client";

import { useState } from "react";
import { FileText, CheckCircle, XCircle, AlertTriangle, User, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ActivityLog } from "@/lib/features/drivers/activity.types";

interface ActivityTimelineProps {
  logs: ActivityLog[];
}

export function ActivityTimeline({ logs }: ActivityTimelineProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Apply filters
  const filteredLogs = logs.filter((log) => {
    if (filterType !== "all" && log.activity_type !== filterType) return false;
    if (filterStatus !== "all" && log.new_status !== filterStatus) return false;
    return true;
  });

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Activity Yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Activity history will appear here when documents are reviewed or driver status changes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/5">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2 flex-wrap">
          <FilterButton
            active={filterType === "all"}
            onClick={() => setFilterType("all")}
          >
            All Activity
          </FilterButton>
          <FilterButton
            active={filterType === "document_status"}
            onClick={() => setFilterType("document_status")}
          >
            Documents
          </FilterButton>
          <FilterButton
            active={filterType === "driver_status"}
            onClick={() => setFilterType("driver_status")}
          >
            Driver Status
          </FilterButton>
          <FilterButton
            active={filterType === "profile_photo_change"}
            onClick={() => setFilterType("profile_photo_change")}
          >
            Photo Changes
          </FilterButton>
          <span className="text-muted-foreground mx-1">•</span>
          <FilterButton
            active={filterStatus === "all"}
            onClick={() => setFilterStatus("all")}
          >
            All Status
          </FilterButton>
          <FilterButton
            active={filterStatus === "approved"}
            onClick={() => setFilterStatus("approved")}
          >
            Approved
          </FilterButton>
          <FilterButton
            active={filterStatus === "rejected"}
            onClick={() => setFilterStatus("rejected")}
          >
            Rejected
          </FilterButton>
        </div>
      </div>

      {/* Results count */}
      {filteredLogs.length !== logs.length && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredLogs.length} of {logs.length} activities
        </p>
      )}

      {/* Timeline */}
      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Filter className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground">No matching activities</p>
          <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredLogs.map((log, index) => (
            <ActivityItem key={log.id} log={log} isLast={index === filteredLogs.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function ActivityItem({ log, isLast }: { log: ActivityLog; isLast: boolean }) {
  const icon = getActivityIcon(log);
  const badge = getStatusBadge(log);
  const formattedDate = formatDate(log.created_at);
  const formattedTime = formatTime(log.created_at);

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${icon.bgClass} flex items-center justify-center relative z-10`}>
        {icon.component}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground mb-1">
              {getActivityTitle(log)}
            </h4>
            <p className="text-xs text-muted-foreground">
              {log.entity_name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
          </div>
          {badge}
        </div>

        {/* Document status change - beautiful display */}
        {log.activity_type === "document_status" && log.old_status && log.new_status && (
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">From</span>
              <Badge variant="outline" className={`text-xs ${
                log.old_status === 'approved' ? 'border-green-500/30 text-green-600' :
                log.old_status === 'rejected' ? 'border-red-500/30 text-red-600' :
                'border-yellow-500/30 text-yellow-600'
              }`}>
                {formatStatus(log.old_status)}
              </Badge>
            </div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              <span className="text-primary text-sm">→</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">To</span>
              <Badge variant="outline" className={`text-xs ${
                log.new_status === 'approved' ? 'border-green-500/30 text-green-600' :
                log.new_status === 'rejected' ? 'border-red-500/30 text-red-600' :
                'border-yellow-500/30 text-yellow-600'
              }`}>
                {formatStatus(log.new_status)}
              </Badge>
            </div>
          </div>
        )}

        {/* Driver status change - beautiful display */}
        {log.activity_type === "driver_status" && log.old_status && log.new_status && (
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">From</span>
              <Badge variant="outline" className="text-xs">
                {formatStatus(log.old_status)}
              </Badge>
            </div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              <span className="text-primary text-sm">→</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">To</span>
              <Badge variant="outline" className="text-xs">
                {formatStatus(log.new_status)}
              </Badge>
            </div>
          </div>
        )}

        {/* Profile photo change - beautiful display */}
        {log.activity_type === "profile_photo_change" && (
          <div className="flex items-center gap-3 mb-2">
            {log.old_status ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground">From</span>
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600">
                    Previous Photo
                  </Badge>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  <span className="text-primary text-sm">→</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground">To</span>
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600">
                    New Photo
                  </Badge>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30">
                <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600">
                  Initial Photo Uploaded
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Reason */}
        {log.reason && (
          <p className="text-sm text-muted-foreground mb-2">
            Reason: {log.reason}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3" />
            <span>{log.performed_by_name}</span>
          </div>
          <span>•</span>
          <time dateTime={log.created_at}>
            {formattedDate} at {formattedTime}
          </time>
        </div>
      </div>
    </div>
  );
}

function getActivityIcon(log: ActivityLog) {
  if (log.activity_type === "document_status") {
    if (log.new_status === "approved") {
      return {
        component: <CheckCircle className="h-5 w-5 text-green-500" />,
        bgClass: "bg-green-500/10 border border-green-500/20",
      };
    }
    if (log.new_status === "rejected") {
      return {
        component: <XCircle className="h-5 w-5 text-red-500" />,
        bgClass: "bg-red-500/10 border border-red-500/20",
      };
    }
    return {
      component: <FileText className="h-5 w-5 text-blue-500" />,
      bgClass: "bg-blue-500/10 border border-blue-500/20",
    };
  }

  // driver_status
  if (log.new_status === "approved") {
    return {
      component: <CheckCircle className="h-5 w-5 text-green-500" />,
      bgClass: "bg-green-500/10 border border-green-500/20",
    };
  }
  if (log.new_status === "suspended") {
    return {
      component: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      bgClass: "bg-yellow-500/10 border border-yellow-500/20",
    };
  }
  return {
    component: <User className="h-5 w-5 text-gray-500" />,
    bgClass: "bg-gray-500/10 border border-gray-500/20",
  };
}

function getStatusBadge(log: ActivityLog) {
  if (log.new_status === "approved") {
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
        Approved
      </Badge>
    );
  }
  if (log.new_status === "rejected") {
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
        Rejected
      </Badge>
    );
  }
  if (log.new_status === "suspended") {
    return (
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        Suspended
      </Badge>
    );
  }
  return null;
}

function getActivityTitle(log: ActivityLog): string {
  if (log.activity_type === "document_status") {
    if (log.new_status === "approved") return "Document Approved";
    if (log.new_status === "rejected") return "Document Rejected";
    return "Document Status Changed";
  }
  if (log.activity_type === "profile_photo_change") {
    return log.old_status ? "Profile Photo Updated" : "Profile Photo Uploaded";
  }
  if (log.new_status === "approved") return "Driver Approved";
  if (log.new_status === "suspended") return "Driver Suspended";
  if (log.new_status === "inactive") return "Driver Deactivated";
  return "Driver Status Changed";
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
