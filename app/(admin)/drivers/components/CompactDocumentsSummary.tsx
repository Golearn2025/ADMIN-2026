"use client";

import { CheckCircle, AlertTriangle, XCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CompactDocumentsSummaryProps {
  approved: number;
  expired: number;
  missing: number;
}

export function CompactDocumentsSummary({
  approved,
  expired,
  missing,
}: CompactDocumentsSummaryProps) {
  const total = approved + expired + missing;
  const isCompliant = expired === 0 && missing === 0 && approved > 0;
  const hasIssues = expired > 0 || missing > 0;

  return (
    <div className="rounded-xl border border-white/5 bg-[#0B0F14] p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-white">Documents Overview</h3>
        </div>
        {isCompliant && (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            All Valid
          </Badge>
        )}
        {hasIssues && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Action Required
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-lg font-bold text-white">{total}</p>
            <p className="text-xs text-gray-500">documents</p>
          </div>
        </div>

        {/* Approved */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Approved</p>
            <p className="text-lg font-bold text-white">{approved}</p>
            <p className="text-xs text-gray-500">valid</p>
          </div>
        </div>

        {/* Expired */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Expired</p>
            <p className="text-lg font-bold text-white">{expired}</p>
            <p className="text-xs text-gray-500">renew</p>
          </div>
        </div>

        {/* Missing */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Missing</p>
            <p className="text-lg font-bold text-white">{missing}</p>
            <p className="text-xs text-gray-500">upload</p>
          </div>
        </div>
      </div>
    </div>
  );
}
