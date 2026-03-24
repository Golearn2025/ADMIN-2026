"use client";

import { useState, useEffect } from "react";
import { Car, Users, Download, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api/apiClient";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
// import { toast } from "sonner";
import { FleetStatsCards } from "./components/FleetStatsCards";
import { VehicleTable } from "./components/VehicleTable";
import { AddVehicleModal } from "./components/AddVehicleModal";
import { VehicleEditModal } from "../drivers/components/VehicleEditModal";

interface Vehicle {
  id: string;
  model_id: string;
  license_plate: string;
  year: number;
  color_id: string;
  status: string;
  driver_id?: string | null;
  driver_name?: string | null;
  category_id: string;
  organization_id: string;
  organization_name?: string;
  created_at: string;
  updated_at: string;
}

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
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch vehicles and drivers
  const fetchVehicles = async () => {
    try {
      const response = await apiFetch('/api/admin/vehicles?includeDrivers=true');
      const data = await response.json();
      
      if (response.ok) {
        setVehicles(data.vehicles || []);
      } else {
        alert('Failed to fetch vehicles');
      }
    } catch (error) {
      alert('Error fetching vehicles');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await apiFetch('/api/admin/drivers/filtered', {
        method: 'POST',
        body: JSON.stringify({})
      });
      const data = await response.json();
      
      if (response.ok && data.drivers) {
        setDrivers(data.drivers.map((driver: any) => ({
          id: driver.id,
          name: `${driver.first_name} ${driver.last_name}`
        })));
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  // Calculate statistics
  const calculateStats = (): {
    categories: CategoryStats;
    models: ModelStats;
    years: YearStats;
  } => {
    const categories: CategoryStats = {
      luxury: vehicles.filter(v => v.category_id === 'luxury').length,
      executive: vehicles.filter(v => v.category_id === 'executive').length,
      suv: vehicles.filter(v => v.category_id === 'suv').length,
      mpv: vehicles.filter(v => v.category_id === 'mpv').length
    };

    const models: ModelStats = {
      "bmw-7-series": vehicles.filter(v => v.model_id === 'bmw-7-series').length,
      "mercedes-s-class": vehicles.filter(v => v.model_id === 'mercedes-s-class').length,
      "mercedes-e-class": vehicles.filter(v => v.model_id === 'mercedes-e-class').length,
      "bmw-5-series": vehicles.filter(v => v.model_id === 'bmw-5-series').length,
      "range-rover": vehicles.filter(v => v.model_id === 'range-rover').length,
      "mercedes-v-class": vehicles.filter(v => v.model_id === 'mercedes-v-class').length
    };

    const years: YearStats = {};
    vehicles.forEach(vehicle => {
      years[vehicle.year] = (years[vehicle.year] || 0) + 1;
    });

    return { categories, models, years };
  };

  // Add vehicle
  const handleAddVehicle = async (vehicleData: AddVehicleData) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleData)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Vehicle added successfully');
        await fetchVehicles(); // Refresh vehicles list
      } else {
        alert(data.error || 'Failed to add vehicle');
      }
    } catch (error) {
      alert('Error adding vehicle');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle vehicle save from edit modal
  const handleSaveVehicle = async (vehicleId: string, data: any) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        alert('Vehicle updated successfully');
        await fetchVehicles();
        setEditModalOpen(false);
        setSelectedVehicle(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update vehicle');
      }
    } catch (error) {
      alert('Error updating vehicle');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle vehicle actions
  const handleEditVehicle = (vehicle: Vehicle) => {
    // Transform vehicle to match VehicleEditModal interface
    const transformedVehicle = {
      ...vehicle,
      model_name: vehicle.model_id, // Use model_id as model_name for now
      make: null,
      model: null,
      status_reason: null,
      status_changed_at: vehicle.updated_at,
      allowed_categories: null
    };
    setSelectedVehicle(transformedVehicle as any);
    setEditModalOpen(true);
  };

  const handleAssignDriver = (vehicle: Vehicle) => {
    // TODO: Implement assign modal
    alert('Assign functionality coming soon');
  };

  const handleViewDocuments = (vehicle: Vehicle) => {
    // TODO: Navigate to vehicle documents
    alert('Documents view coming soon');
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    // TODO: Implement delete with confirmation
    alert('Delete functionality coming soon');
  };

  // Export vehicles
  const handleExport = () => {
    // TODO: Implement CSV/Excel export
    alert('Export functionality coming soon');
  };

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, []);

  const stats = calculateStats();

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Vehicles"
          subtitle="Manage fleet vehicles and assignments"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" onClick={() => setAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </>
          }
        />
        <div className="flex items-center justify-center py-12">
          <Car className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="Manage fleet vehicles and assignments"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {/* Statistics Cards */}
        <FleetStatsCards
          categoryStats={stats.categories}
          modelStats={stats.models}
          yearStats={stats.years}
        />

        {/* Vehicles Table */}
        <VehicleTable
          vehicles={vehicles}
          onEdit={handleEditVehicle}
          onAssign={handleAssignDriver}
          onViewDocuments={handleViewDocuments}
          onDelete={handleDeleteVehicle}
        />
      </div>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddVehicle}
        drivers={drivers}
        isProcessing={isProcessing}
      />

      {/* Edit Vehicle Modal */}
      {selectedVehicle && (
        <VehicleEditModal
          vehicle={selectedVehicle}
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
