"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Car, Download, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api/apiClient";
import { PageHeader } from "@/components/common";
import { DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import { FleetStatsCards } from "./components/FleetStatsCards";
import { AddVehicleModal } from "./components/AddVehicleModal";
import { VehicleEditModal } from "../drivers/components/VehicleEditModal";
import { createColumns, type Vehicle } from "./vehicles.columns";

interface Driver {
  id: string;
  name: string;
}

interface CategoryStats {
  luxury: number;
  executive: number;
  suv: number;
  mpv: number;
}

interface ModelStats {
  "bmw-7-series": number;
  "mercedes-s-class": number;
  "mercedes-e-class": number;
  "bmw-5-series": number;
  "range-rover": number;
  "mercedes-v-class": number;
}

interface YearStats {
  [key: number]: number;
}

interface AddVehicleData {
  license_plate: string;
  model_id: string;
  year: number;
  color_id: string;
  driver_id?: string | null;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDeferredValue(searchValue);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(
        "/api/admin/vehicles?includeDrivers=true"
      );
      const data = await response.json();

      if (response.ok) {
        setVehicles(data.vehicles || []);
      } else {
        console.error("Failed to fetch vehicles:", data.error);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await apiFetch("/api/admin/drivers/filtered", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (response.ok && data.drivers) {
        setDrivers(
          data.drivers.map((driver: { id: string; first_name: string; last_name: string }) => ({
            id: driver.id,
            name: `${driver.first_name} ${driver.last_name}`,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const stats = useMemo(() => {
    const categories: CategoryStats = {
      luxury: vehicles.filter((v) => v.category_id === "luxury").length,
      executive: vehicles.filter((v) => v.category_id === "executive").length,
      suv: vehicles.filter((v) => v.category_id === "suv").length,
      mpv: vehicles.filter((v) => v.category_id === "mpv").length,
    };

    const models: ModelStats = {
      "bmw-7-series": vehicles.filter((v) => v.model_id === "bmw-7-series").length,
      "mercedes-s-class": vehicles.filter((v) => v.model_id === "mercedes-s-class").length,
      "mercedes-e-class": vehicles.filter((v) => v.model_id === "mercedes-e-class").length,
      "bmw-5-series": vehicles.filter((v) => v.model_id === "bmw-5-series").length,
      "range-rover": vehicles.filter((v) => v.model_id === "range-rover").length,
      "mercedes-v-class": vehicles.filter((v) => v.model_id === "mercedes-v-class").length,
    };

    const years: YearStats = {};
    vehicles.forEach((vehicle) => {
      years[vehicle.year] = (years[vehicle.year] || 0) + 1;
    });

    return { categories, models, years };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.license_plate.toLowerCase().includes(q) ||
        v.driver_name?.toLowerCase().includes(q) ||
        v.model_id.toLowerCase().includes(q) ||
        v.organization_name?.toLowerCase().includes(q)
    );
  }, [vehicles, debouncedSearch]);

  const pagedVehicles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleAddVehicle = async (vehicleData: AddVehicleData) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicleData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Vehicle added successfully");
        await fetchVehicles();
      } else {
        alert(data.error || "Failed to add vehicle");
      }
    } catch {
      alert("Error adding vehicle");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveVehicle = async (vehicleId: string, data: unknown) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        alert("Vehicle updated successfully");
        await fetchVehicles();
        setEditModalOpen(false);
        setSelectedVehicle(null);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update vehicle");
      }
    } catch {
      alert("Error updating vehicle");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setEditModalOpen(true);
  };

  const columns = createColumns({
    onEdit: handleEditVehicle,
    onAssign: () => alert("Assign functionality coming soon"),
    onViewDocuments: () => alert("Documents view coming soon"),
    onDelete: () => alert("Delete functionality coming soon"),
  });

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        subtitle="Manage fleet vehicles and assignments"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert("Export functionality coming soon")}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </>
        }
      />

      <div className="space-y-4 px-3 sm:px-4 md:px-6 md:space-y-6">
        <FleetStatsCards
          categoryStats={stats.categories}
          modelStats={stats.models}
          yearStats={stats.years}
        />

        <DataTableShell
          columns={columns}
          rows={pagedVehicles}
          totalRows={filteredVehicles.length}
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search license plate or driver..."
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          emptyIcon={Car}
          emptyTitle="No vehicles found"
          emptyDescription="No vehicles match your search criteria."
        />
      </div>

      <AddVehicleModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddVehicle}
        drivers={drivers}
        isProcessing={isProcessing}
      />

      {selectedVehicle && (
        <VehicleEditModal
          vehicle={{
            ...selectedVehicle,
            model_name: selectedVehicle.model_id,
            make: null,
            model: null,
            status_reason: null,
            status_changed_at: selectedVehicle.updated_at,
            allowed_categories: null,
          } as never}
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) setSelectedVehicle(null);
          }}
          onSave={handleSaveVehicle}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
