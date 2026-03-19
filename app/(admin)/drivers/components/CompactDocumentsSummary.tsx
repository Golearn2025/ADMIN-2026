"use client";

import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface CompactDocumentsSummaryProps {
  uploaded: number;
  expiring: number;
  missing: number;
}

export function CompactDocumentsSummary({
  uploaded,
  expiring,
  missing,
}: CompactDocumentsSummaryProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#0B0F14] p-6 shadow-lg">
      <div className="flex items-center justify-around gap-8">
        {/* Uploaded */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2 bg-white/5">
            <CheckCircle className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{uploaded}</p>
            <p className="text-xs text-gray-400">Uploaded</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-12 w-px bg-white/5" />

        {/* Expiring */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2 bg-white/5">
            <AlertTriangle className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{expiring}</p>
            <p className="text-xs text-gray-400">Expiring</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-12 w-px bg-white/5" />

        {/* Missing */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2 bg-white/5">
            <XCircle className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{missing}</p>
            <p className="text-xs text-gray-400">Missing</p>
          </div>
        </div>
      </div>
    </div>
  );
}
