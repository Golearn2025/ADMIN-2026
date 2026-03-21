// ============================================================================
// useDriversPage - MAIN PAGE STATE MANAGEMENT
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import type { Driver } from "../drivers.types";
import { createClient } from "@/lib/supabase/client";

interface AdvancedFilters {
  category: string[];
  make: string[];
  color: string[];
  year: number[];
}

export function useDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<string[]>([]);
  const [onboardingFilter, setOnboardingFilter] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    category: [],
    make: [],
    color: [],
    year: [],
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Refetch when advanced filters change
  useEffect(() => {
    if (advancedFilters.category.length > 0 || advancedFilters.make.length > 0 || advancedFilters.color.length > 0 || advancedFilters.year.length > 0) {
      fetchDriversWithFilters();
    } else {
      fetchDrivers();
    }
  }, [advancedFilters]);

  const fetchDrivers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/drivers");

      if (!response.ok) {
        throw new Error("Failed to fetch drivers");
      }

      const data = await response.json();
      setDrivers(data.drivers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching drivers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDriversWithFilters = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get organization ID from API (same as fetchDrivers)
      const response = await fetch("/api/admin/drivers/filtered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: advancedFilters.category.length > 0 ? advancedFilters.category : null,
          make: advancedFilters.make.length > 0 ? advancedFilters.make : null,
          color: advancedFilters.color.length > 0 ? advancedFilters.color : null,
          year: advancedFilters.year.length > 0 ? advancedFilters.year : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch filtered drivers");
      }

      const data = await response.json();
      console.log("📊 RPC returned drivers:", data.drivers?.length || 0);
      setDrivers(data.drivers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching filtered drivers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter drivers based on search and filters
  const filteredDrivers = drivers.filter((driver) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        driver.first_name.toLowerCase().includes(query) ||
        driver.last_name.toLowerCase().includes(query) ||
        driver.email?.toLowerCase().includes(query) ||
        driver.phone?.toLowerCase().includes(query);

      if (!matchesSearch) return false;
    }

    // Compliance filter
    if (complianceFilter.length > 0) {
      if (!complianceFilter.includes(driver.compliance_status)) {
        return false;
      }
    }

    // Onboarding filter
    if (onboardingFilter.length > 0) {
      if (!onboardingFilter.includes(driver.onboarding_status)) {
        return false;
      }
    }

    return true;
  });

  console.log("🔢 Drivers count:", {
    fromRPC: drivers.length,
    afterClientFilter: filteredDrivers.length,
    searchQuery,
    complianceFilter,
    onboardingFilter
  });

  const selectedDriver = selectedDriverId
    ? drivers.find((d) => d.id === selectedDriverId) || null
    : null;

  return {
    drivers: filteredDrivers,
    selectedDriver,
    selectedDriverId,
    setSelectedDriverId,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    complianceFilter,
    setComplianceFilter,
    onboardingFilter,
    setOnboardingFilter,
    advancedFilters,
    setAdvancedFilters,
    refetch: fetchDrivers,
  };
}
