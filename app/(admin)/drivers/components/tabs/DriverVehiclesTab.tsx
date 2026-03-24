"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { VehicleTable } from "../VehicleTable";
import { VehicleEditModal } from "../VehicleEditModal";

interface Vehicle {
  id: string;
  category_id: string;
  model_id: string;
  model_name: string;
  make: string | null;
  model: string | null;
  year: number;
  license_plate: string;
  color_id: string;
  status: string;
  status_reason: string | null;
  status_changed_at: string;
  created_at: string;
  updated_at: string;
  allowed_categories: string[] | null;
}

interface DriverVehiclesTabProps {
  vehicles: Vehicle[];
}

interface VehicleFormData {
  license_plate: string;
  model_id: string;
  year: number;
  color_id: string;
  status: string;
  status_reason: string;
  allowed_categories: string[];
}

export function DriverVehiclesTab({ vehicles }: DriverVehiclesTabProps) {
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditModalOpen(true);
  };

  const handleSave = async (vehicleId: string, data: VehicleFormData) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update vehicle');
      }

      toast({
        title: "Vehicle Updated",
        description: "Vehicle information has been successfully updated.",
      });
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update vehicle",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (vehicleId: string, status: string, reason?: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/vehicles/${vehicleId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, status_reason: reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update vehicle status');
      }

      toast({
        title: "Status Updated",
        description: `Vehicle status has been changed to ${status}.`,
      });
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update vehicle status",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <VehicleTable
        vehicles={vehicles}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        isProcessing={isProcessing}
      />

      <VehicleEditModal
        vehicle={editingVehicle}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={handleSave}
        isProcessing={isProcessing}
      />
    </div>
  );
}
