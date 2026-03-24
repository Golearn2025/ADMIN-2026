"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, User, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api/apiClient";

interface DriversSidebarListProps {
  drivers: Driver[];
  selectedDriverId: string | null;
  setSelectedDriverId: (id: string) => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onFiltersChange?: (filters: AdvancedFilters) => void;
}

interface AdvancedFilters {
  category: string[];
  make: string[];
  color: string[];
  year: number[];
}

export function DriversSidebarList({
  drivers,
  selectedDriverId,
  setSelectedDriverId,
  isLoading,
  searchQuery,
  setSearchQuery,
  onFiltersChange,
}: DriversSidebarListProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({
    category: [],
    make: [],
    color: [],
    year: [],
  });
  const [filterOptions, setFilterOptions] = useState<{
    categories: string[];
    makes: string[];
    colors: string[];
    years: number[];
  }>({ categories: [], makes: [], colors: [], years: [] });

  // Load filter options from API
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const response = await apiFetch("/api/admin/drivers/filter-options");
        if (response.ok) {
          const data = await response.json();
          setFilterOptions(data);
        }
      } catch (error) {
        console.error("Failed to load filter options:", error);
      }
    }
    loadFilterOptions();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    if (onFiltersChange) {
      const timer = setTimeout(() => {
        onFiltersChange(filters);
      }, 300); // Debounce 300ms
      return () => clearTimeout(timer);
    }
  }, [filters, onFiltersChange]);

  const toggleFilter = (type: keyof AdvancedFilters, value: string | number) => {
    setFilters(prev => {
      const currentArray = prev[type];
      const typedValue = value as string & number;
      
      return {
        ...prev,
        [type]: currentArray.includes(typedValue)
          ? currentArray.filter(v => v !== typedValue)
          : [...currentArray, typedValue]
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({ category: [], make: [], color: [], year: [] });
  };

  const removeFilter = (type: keyof AdvancedFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].filter(v => v !== value)
    }));
  };

  const activeFiltersCount = filters.category.length + filters.make.length + filters.color.length + filters.year.length;
  const getStatusBadge = (driver: Driver) => {
    // Show only PRIMARY status - driver.status is source of truth
    if (driver.status === 'approved') {
      return { label: 'Active', variant: 'default' as const, className: 'bg-green-500/10 text-green-600 border-green-500/20' };
    }
    if (driver.status === 'suspended') {
      return { label: 'Suspended', variant: 'secondary' as const, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
    }
    if (driver.status === 'inactive') {
      return { label: 'Inactive', variant: 'outline' as const, className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
    }
    // Pending = not yet approved
    return { label: 'Pending', variant: 'secondary' as const, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
  };


  return (
    <div className="flex h-full flex-col bg-background">
      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="border-b border-border">
        <div className="px-3 py-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Advanced Filters</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Panel */}
        {showAdvancedFilters && (
          <div className="px-3 pb-4 space-y-4 bg-muted/30 border-t border-border">
            {/* Active Filters Chips */}
            {activeFiltersCount > 0 && (
              <div className="pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Active Filters</span>
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive">
                    Clear all
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filters.category.map(cat => (
                    <Badge key={cat} variant="secondary" className="gap-1.5 pr-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                      <span className="text-xs">{cat}</span>
                      <button onClick={() => removeFilter('category', cat)} className="hover:bg-primary/30 rounded-sm p-0.5 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {filters.make.map(make => (
                    <Badge key={make} variant="secondary" className="gap-1.5 pr-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                      <span className="text-xs">{make}</span>
                      <button onClick={() => removeFilter('make', make)} className="hover:bg-primary/30 rounded-sm p-0.5 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {filters.color.map(color => (
                    <Badge key={color} variant="secondary" className="gap-1.5 pr-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                      <span className="text-xs">{color}</span>
                      <button onClick={() => removeFilter('color', color)} className="hover:bg-primary/30 rounded-sm p-0.5 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Category</label>
              <div className="space-y-0.5 bg-background/50 rounded-lg p-2">
                {filterOptions.categories.map(cat => (
                  <label key={cat} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-primary/5 rounded-md px-2.5 py-1.5 transition-colors group">
                    <input
                      type="checkbox"
                      checked={filters.category.includes(cat)}
                      onChange={() => toggleFilter('category', cat)}
                      className="rounded border-border text-primary focus:ring-primary focus:ring-offset-0 w-4 h-4"
                    />
                    <span className="group-hover:text-foreground text-muted-foreground transition-colors">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Make Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Make</label>
              <div className="space-y-0.5 bg-background/50 rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar">
                {filterOptions.makes.map(make => (
                  <label key={make} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-primary/5 rounded-md px-2.5 py-1.5 transition-colors group">
                    <input
                      type="checkbox"
                      checked={filters.make.includes(make)}
                      onChange={() => toggleFilter('make', make)}
                      className="rounded border-border text-primary focus:ring-primary focus:ring-offset-0 w-4 h-4"
                    />
                    <span className="group-hover:text-foreground text-muted-foreground transition-colors">{make}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Color Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Color</label>
              <div className="space-y-0.5 bg-background/50 rounded-lg p-2">
                {filterOptions.colors.map(color => (
                  <label key={color} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-primary/5 rounded-md px-2.5 py-1.5 transition-colors group">
                    <input
                      type="checkbox"
                      checked={filters.color.includes(color)}
                      onChange={() => toggleFilter('color', color)}
                      className="rounded border-border text-primary focus:ring-primary focus:ring-offset-0 w-4 h-4"
                    />
                    <span className="group-hover:text-foreground text-muted-foreground transition-colors">{color}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Year Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Year</label>
              <div className="space-y-0.5 bg-background/50 rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar">
                {filterOptions.years.map(year => (
                  <label key={year} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-primary/5 rounded-md px-2.5 py-1.5 transition-colors group">
                    <input
                      type="checkbox"
                      checked={filters.year.includes(year)}
                      onChange={() => toggleFilter('year', year)}
                      className="rounded border-border text-primary focus:ring-primary focus:ring-offset-0 w-4 h-4"
                    />
                    <span className="group-hover:text-foreground text-muted-foreground transition-colors">{year}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Result Count */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs font-medium text-muted-foreground">
                {drivers.length} driver{drivers.length !== 1 ? 's' : ''} found
              </span>
              {activeFiltersCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drivers List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">Loading drivers...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">No drivers found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {drivers.map((driver) => {
              const statusBadge = getStatusBadge(driver);
              return (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriverId(driver.id)}
                  className={`w-full rounded-lg p-3 text-left transition-all ${
                    selectedDriverId === driver.id
                      ? 'bg-primary/10 border border-primary/20 shadow-sm'
                      : 'bg-card border border-border hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Square Avatar */}
                    <Avatar
                      src={driver.profile_photo_url}
                      fallback={driver.full_name}
                      className="h-12 w-12 rounded-lg text-sm shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">
                          {driver.full_name}
                        </p>
                        <Badge
                          variant={statusBadge.variant}
                          className={`text-xs shrink-0 border ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground truncate">
                        {driver.email || driver.phone}
                      </p>
                      {(driver.status === 'suspended' || driver.status === 'inactive') && driver.status_reason && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 truncate mt-0.5">
                          {driver.status_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
