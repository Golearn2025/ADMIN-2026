"use client";

type FilterTab = 'all' | 'pending' | 'approved' | 'suspended' | 'inactive' | 'missing_docs' | 'expiring';

interface DriversPageHeaderProps {
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  suspendedCount: number;
  inactiveCount: number;
  missingDocsCount: number;
  expiringCount: number;
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
}

export function DriversPageHeader({
  totalCount,
  pendingCount,
  approvedCount,
  suspendedCount,
  inactiveCount,
  missingDocsCount,
  expiringCount,
  activeFilter,
  onFilterChange,
}: DriversPageHeaderProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Title */}
        <h1 className="text-2xl font-bold">Drivers</h1>
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
            onClick={() => onFilterChange('suspended')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === 'suspended'
                ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
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
            onClick={() => onFilterChange('inactive')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
              activeFilter === 'inactive'
                ? 'bg-white/10 text-white border border-white/20'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Inactive
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeFilter === 'inactive' ? 'bg-white/20' : 'bg-background'
            }`}>
              {inactiveCount}
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

        </div>
      </div>
    </div>
  );
}
