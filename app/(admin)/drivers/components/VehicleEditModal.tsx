"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Car, Tag, Hash, Palette, Activity } from "lucide-react";

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

interface VehicleEditModalProps {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vehicleId: string, data: VehicleFormData) => Promise<void>;
  isProcessing: boolean;
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

// Vehicle models from store database
const VEHICLE_MODELS = [
  { id: 'bmw-7-series', label: 'BMW 7 Series', category_id: 'luxury' },
  { id: 'mercedes-s-class', label: 'Mercedes S Class', category_id: 'luxury' },
  { id: 'bmw-5-series', label: 'BMW 5 Series', category_id: 'executive' },
  { id: 'mercedes-e-class', label: 'Mercedes E Class', category_id: 'executive' },
  { id: 'range-rover', label: 'Range Rover', category_id: 'suv' },
  { id: 'mercedes-v-class', label: 'Mercedes V Class', category_id: 'mpv' },
];

const AVAILABLE_CATEGORIES = [
  { id: 'luxury', label: 'Luxury' },
  { id: 'executive', label: 'Executive' },
  { id: 'suv', label: 'SUV' },
  { id: 'mpv', label: 'MPV' },
];

// Colors actually used in the system
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

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'suspended', label: 'Suspended' },
];

export function VehicleEditModal({
  vehicle,
  open,
  onOpenChange,
  onSave,
  isProcessing,
}: VehicleEditModalProps) {
  const [formData, setFormData] = useState<VehicleFormData>({
    license_plate: vehicle?.license_plate || '',
    model_id: vehicle?.model_id || '',
    year: (vehicle?.year && VALID_YEARS.includes(vehicle.year)) ? vehicle.year : currentYear,
    color_id: vehicle?.color_id || '',
    status: vehicle?.status || 'active',
    status_reason: vehicle?.status_reason || '',
    allowed_categories: vehicle?.allowed_categories || [],
  });

  // Reset form when vehicle changes (not on every input change)
  useEffect(() => {
    if (vehicle) {
      setFormData({
        license_plate: vehicle.license_plate,
        model_id: vehicle.model_id,
        year: (vehicle.year && VALID_YEARS.includes(vehicle.year)) ? vehicle.year : currentYear,
        color_id: vehicle.color_id,
        status: vehicle.status,
        status_reason: vehicle.status_reason || '',
        allowed_categories: vehicle.allowed_categories || [],
      });
    }
  }, [vehicle?.id]); // Only reset when vehicle ID changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;

    // Validate year (must be from allowed years - max 3 years old)
    if (!VALID_YEARS.includes(formData.year)) {
      alert(`Year must be between ${VALID_YEARS[VALID_YEARS.length - 1]} and ${VALID_YEARS[0]} (max 3 years old per store rules)`);
      return;
    }

    // Validate status reason for suspended/inactive
    if ((formData.status === 'suspended' || formData.status === 'inactive') && !formData.status_reason.trim()) {
      alert('Status reason is required for suspended/inactive status');
      return;
    }

    await onSave(vehicle.id, formData);
    onOpenChange(false);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => {
      const current = prev.allowed_categories || [];
      const selectedModel = VEHICLE_MODELS.find(m => m.id === prev.model_id);
      const baseCategory = selectedModel?.category_id || vehicle?.category_id;
      
      // Don't allow unchecking the base category
      if (categoryId === baseCategory) {
        return prev;
      }

      if (current.includes(categoryId)) {
        return {
          ...prev,
          allowed_categories: current.filter(c => c !== categoryId)
        };
      } else {
        return {
          ...prev,
          allowed_categories: [...current, categoryId]
        };
      }
    });
  };

  const getAllowedCategories = () => {
    const selectedModel = VEHICLE_MODELS.find(m => m.id === formData.model_id);
    const baseCategory = selectedModel?.category_id || vehicle?.category_id;
    const allowed = formData.allowed_categories || [];
    
    // Always include base category
    const allCategories = baseCategory ? [baseCategory, ...allowed.filter(c => c !== baseCategory)] : allowed;
    
    return allCategories;
  };

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Edit Vehicle - {vehicle.model_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle Model
              </Label>
              <Select
                value={formData.model_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, model_id: value }))}
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
                          {AVAILABLE_CATEGORIES.find(c => c.id === model.category_id)?.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_plate" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                License Plate
              </Label>
              <Input
                id="license_plate"
                value={formData.license_plate}
                onChange={(e) => {
                  console.log('🔧 License plate onChange:', e.target.value);
                  console.log('🔧 Before setFormData - license_plate:', formData.license_plate);
                  setFormData(prev => {
                    const newData = { ...prev, license_plate: e.target.value };
                    console.log('🔧 After setFormData - new data:', newData);
                    return newData;
                  });
                }}
                placeholder="Enter license plate"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Year
              </Label>
              <Select
                value={formData.year.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, year: parseInt(value) }))}
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
              <Label htmlFor="status" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Reason */}
          {(formData.status === 'suspended' || formData.status === 'inactive') && (
            <div className="space-y-2">
              <Label htmlFor="status_reason">Status Reason</Label>
              <Input
                id="status_reason"
                value={formData.status_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, status_reason: e.target.value }))}
                placeholder="Enter reason for status change"
                required
              />
            </div>
          )}

          {/* Categories */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Base Category
              </Label>
              <div className="flex items-center gap-2">
                {(() => {
                  const selectedModel = VEHICLE_MODELS.find(m => m.id === formData.model_id);
                  const categoryLabel = AVAILABLE_CATEGORIES.find(c => c.id === selectedModel?.category_id)?.label || 'Unknown';
                  return (
                    <Badge variant="default">
                      {categoryLabel}
                    </Badge>
                  );
                })()}
                <span className="text-sm text-muted-foreground">(determined by vehicle model)</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Can Also Accept Jobs From:</Label>
              <div className="space-y-2">
                {(() => {
                  const selectedModel = VEHICLE_MODELS.find(m => m.id === formData.model_id);
                  const baseCategory = selectedModel?.category_id;
                  return AVAILABLE_CATEGORIES
                    .filter(cat => cat.id !== baseCategory) // Don't show base category
                    .map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.id}
                          checked={formData.allowed_categories?.includes(category.id) || false}
                          onCheckedChange={() => handleCategoryToggle(category.id)}
                        />
                        <Label htmlFor={category.id} className="text-sm font-normal">
                          {category.label}
                        </Label>
                      </div>
                    ));
                })()}
              </div>
            </div>

            {/* Preview of all categories */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Current Acceptable Categories:</Label>
              <div className="flex flex-wrap gap-1">
                {getAllowedCategories().map(categoryId => {
                  const category = AVAILABLE_CATEGORIES.find(c => c.id === categoryId);
                  return (
                    <Badge key={categoryId} variant="outline" className="text-xs">
                      {category?.label || categoryId}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
