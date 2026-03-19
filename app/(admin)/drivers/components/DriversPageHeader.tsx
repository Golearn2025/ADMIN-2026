"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle, Shield, Clock, Ban, XCircle } from "lucide-react";
import { useState } from "react";

type FilterTab = 'all' | 'pending' | 'approved' | 'authorized' | 'suspended' | 'missing_docs' | 'expiring' | 'rejected';

interface DriversPageHeaderProps {
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  authorizedCount: number;
  suspendedCount: number;
  missingDocsCount: number;
  expiringCount: number;
  rejectedCount: number;
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
  onApprove?: () => void;
  onAuthorize?: () => void;
  onPutPending?: () => void;
  onSuspend?: () => void;
  onReject?: () => void;
}

export function DriversPageHeader({
  totalCount,
  pendingCount,
  approvedCount,
  authorizedCount,
  suspendedCount,
  missingDocsCount,
  expiringCount,
  rejectedCount,
  activeFilter,
  onFilterChange,
  onApprove,
  onAuthorize,
  onPutPending,
  onSuspend,
  onReject,
}: DriversPageHeaderProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Title */}
        <h1 className="text-2xl font-bold">Drivers</h1>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onApprove}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Approve
          </Button>
          <Button
            onClick={onAuthorize}
            size="sm"
            variant="outline"
          >
            <Shield className="h-4 w-4 mr-1.5" />
            Authorize
          </Button>
          <Button
            onClick={onPutPending}
            size="sm"
            variant="outline"
          >
            <Clock className="h-4 w-4 mr-1.5" />
            Put Pending
          </Button>
          <Button
            onClick={onSuspend}
            size="sm"
            variant="outline"
          >
            <Ban className="h-4 w-4 mr-1.5" />
            Suspend
          </Button>
          <Button
            onClick={onReject}
            size="sm"
            variant="outline"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Reject
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 pb-4">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => onFilterChange('all')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            All
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeFilter === 'all' ? 'bg-white/20' : 'bg-background'
            }`}>
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => onFilterChange('pending')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === 'pending'
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Pending Review
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeFilter === 'pending' ? 'bg-white/20' : 'bg-background'
            }`}>
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => onFilterChange('approved')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === 'approved'
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Approved
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeFilter === 'approved' ? 'bg-white/20' : 'bg-background'
            }`}>
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => onFilterChange('authorized')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === 'authorized'
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Authorized
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeFilter === 'authorized' ? 'bg-white/20' : 'bg-background'
            }`}>
              {authorizedCount}
            </span>
          </button>

          <button
            onClick={() => onFilterChange('suspended')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === 'suspended'
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Suspended
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeFilter === 'suspended' ? 'bg-white/20' : 'bg-background'
            }`}>
              {suspendedCount}
            </span>
          </button>

          <button
            onClick={() => onFilterChange('missing_docs')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === 'missing_docs'
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Missing Documents
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeFilter === 'missing_docs' ? 'bg-white/20' : 'bg-background'
            }`}>
              {missingDocsCount}
            </span>
          </button>

          <button
            onClick={() => onFilterChange('expiring')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === 'expiring'
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Expiring Soon
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeFilter === 'expiring' ? 'bg-white/20' : 'bg-background'
            }`}>
              {expiringCount}
            </span>
          </button>

          <button
            onClick={() => onFilterChange('rejected')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === 'rejected'
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Rejected
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeFilter === 'rejected' ? 'bg-white/20' : 'bg-background'
            }`}>
              {rejectedCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
