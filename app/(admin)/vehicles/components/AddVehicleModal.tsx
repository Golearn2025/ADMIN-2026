"use client";

import { useState } from "react";
import { Car, Hash, Palette, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Driver {
  id: string;
  name: string;
}

interface AddVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (vehicleData: AddVehicleData) => Promise<void>;
  drivers: Driver[];
  isProcessing: boolean;
}

interface AddVehicleData {
  license_plate: string;
  model_id: string;
  year: number;
  color_id: string;
  driver_id?: string | null;
}

// Vehicle models from store database
const VEHICLE_MODELS = [
  { id: 'bmw-7-series', label: 'BMW 7 Series', category_id: 'luxury' },
  { id: 'mercedes-s-class', label: 'Mercedes S Class', category_id: 'luxury' },
  { id: 'bmw-5-series', label: 'BMW 5 Series', category_id: 'executive' },
  { id: 'mercedes-e-class', label: 'Mercedes E Class', category_id: 'executive' },
  { id: 'range-rover', label: 'Range Rover', category_id: 'suv' },
  { id: 'mercedes-v-class', label: 'Mercedes V Class', category_id: 'mpv' },
];

const COLORS = [
  { id: 'black', name: 'Black', hex: '#000000' },
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'silver', name: 'Silver', hex: '#C0C0C0' },
  { id: 'gray', name: 'Gray', hex: '#808080' },
  { id: 'blue', name: 'Blue', hex: '#2563EB' },
  { id: 'champagne', name: 'Champagne', hex: '#F7E7CE' },
  { id: 'red', name: 'Red', hex: '#DC2626' },
  { id: 'green', name: 'Green', hex: '#16A34A' },
  { id: 'yellow', name: 'Yellow', hex: '#EAB308' },
  { id: 'orange', name: 'Orange', hex: '#EA580C' },
  { id: 'brown', name: 'Brown', hex: '#92400E' },
];

// Generate valid years (max 3 years old per store rules)
const currentYear = new Date().getFullYear();
const VALID_YEARS = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]; // 2026, 2025, 2024, 2023

const CATEGORY_LABELS: { [key: string]: string } = {
  luxury: "Luxury",
  executive: "Executive",
  suv: "SUV",
  mpv: "MPV"
};

export function AddVehicleModal({ 
  open, 
  onOpenChange, 
  onAdd, 
  drivers, 
  isProcessing 
}: AddVehicleModalProps) {
  const [formData, setFormData] = useState<AddVehicleData>({
    license_plate: '',
    model_id: '',
    year: currentYear,
    color_id: '',
    driver_id: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.license_plate || !formData.model_id || !formData.color_id) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate year (must be from allowed years - max 3 years old)
    if (!VALID_YEARS.includes(formData.year)) {
      alert(`Year must be between ${VALID_YEARS[VALID_YEARS.length - 1]} and ${VALID_YEARS[0]} (max 3 years old per store rules)`);
      return;
    }

    await onAdd(formData);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      license_plate: '',
      model_id: '',
      year: currentYear,
      color_id: '',
      driver_id: null,
    });
  };

  const selectedModel = VEHICLE_MODELS.find(m => m.id === formData.model_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Add New Vehicle
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="model" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicle Model
            </Label>
            <Select
              value={formData.model_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, model_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle model" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[model.category_id]}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Basic Information */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="license_plate" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                License Plate
              </Label>
              <Input
                id="license_plate"
                value={formData.license_plate}
                onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value }))}
                placeholder="Enter license plate"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Year
              </Label>
              <Select
                value={formData.year.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, year: parseInt(value) }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {VALID_YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color
              </Label>
              <Select
                value={formData.color_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, color_id: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((color) => (
                    <SelectItem key={color.id} value={color.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full border border-border"
                          style={{ backgroundColor: color.hex }}
                        />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Assign Driver
              </Label>
              <Select
                value={formData.driver_id || ""}
                onValueChange={(value) => setFormData(prev => ({ ...prev, driver_id: value || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Preview */}
          {selectedModel && (
            <div className="space-y-2">
              <Label>Vehicle Category</Label>
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {CATEGORY_LABELS[selectedModel.category_id]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  (determined by vehicle model)
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? "Adding..." : "Add Vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
