// ============================================================================
// useDriversPage - MAIN PAGE STATE MANAGEMENT
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import type { Driver } from "../drivers.types";

interface UseDriversPageProps {
  organizationId: string;
}

export function useDriversPage({ organizationId }: UseDriversPageProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<string[]>([]);
  const [onboardingFilter, setOnboardingFilter] = useState<string[]>([]);

  useEffect(() => {
    fetchDrivers();
  }, [organizationId]);

  const fetchDrivers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/drivers?organizationId=${organizationId}`
      );

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

  // Filter drivers based on search and filters
  const filteredDrivers = drivers.filter((driver) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        driver.first_name.toLowerCase().includes(query) ||
        driver.last_name.toLowerCase().includes(query) ||
        driver.email?.toLowerCase().includes(query) ||
        driver.phone.toLowerCase().includes(query);

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
    refetch: fetchDrivers,
  };
}
