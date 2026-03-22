"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Car, 
  MoreVertical, 
  Edit, 
  Activity,
  Tag,
  Hash,
  Palette
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface VehicleTableProps {
  vehicles: Vehicle[];
  onEdit: (vehicle: Vehicle) => void;
  onStatusChange: (vehicleId: string, status: string, reason?: string) => void;
  isProcessing?: boolean;
}

const AVAILABLE_CATEGORIES = [
  { id: 'luxury', label: 'Luxury', variant: 'default' as const, color: 'text-purple-500' },
  { id: 'executive', label: 'Executive', variant: 'default' as const, color: 'text-blue-500' },
  { id: 'suv', label: 'SUV', variant: 'secondary' as const, color: 'text-orange-500' },
  { id: 'mpv', label: 'MPV', variant: 'secondary' as const, color: 'text-teal-500' },
];

const getCategoryBadge = (categoryId: string) => {
  const category = AVAILABLE_CATEGORIES.find(c => c.id === categoryId) || 
    { id: categoryId, label: categoryId, variant: 'outline' as const, color: 'text-gray-500' };
  return (
    <Badge variant={category.variant} className="gap-1">
      <Tag className={`h-3 w-3 ${category.color}`} />
      {category.label}
    </Badge>
  );
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'inactive':
      return <Badge variant="secondary">Inactive</Badge>;
    case 'maintenance':
      return <Badge variant="warning">Maintenance</Badge>;
    case 'suspended':
      return <Badge variant="destructive">Suspended</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getColorDisplay = (colorId: string) => {
  const colors: Record<string, { name: string; hex: string }> = {
    black: { name: 'Black', hex: '#000000' },
    white: { name: 'White', hex: '#FFFFFF' },
    silver: { name: 'Silver', hex: '#C0C0C0' },
    gray: { name: 'Gray', hex: '#808080' },
    red: { name: 'Red', hex: '#DC2626' },
    blue: { name: 'Blue', hex: '#2563EB' },
    green: { name: 'Green', hex: '#16A34A' },
    yellow: { name: 'Yellow', hex: '#EAB308' },
    orange: { name: 'Orange', hex: '#EA580C' },
    brown: { name: 'Brown', hex: '#92400E' },
  };

  const color = colors[colorId] || { name: colorId, hex: '#6B7280' };
  
  return (
    <div className="flex items-center gap-2">
      <div 
        className="h-4 w-4 rounded-full border border-border"
        style={{ backgroundColor: color.hex }}
      />
      <span className="text-sm">{color.name}</span>
    </div>
  );
};

const getAllowedCategoriesDisplay = (vehicle: Vehicle) => {
  const baseCategory = vehicle.category_id;
  const allowedCategories = vehicle.allowed_categories || [];
  
  // Include base category and all allowed categories
  const allCategories = [baseCategory, ...allowedCategories.filter(c => c !== baseCategory)];
  
  if (allCategories.length === 1) {
    return getCategoryBadge(allCategories[0]);
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      {allCategories.map(categoryId => (
        <div key={categoryId} className="text-xs">
          {getCategoryBadge(categoryId)}
        </div>
      ))}
    </div>
  );
};

export function VehicleTable({ 
  vehicles, 
  onEdit, 
  onStatusChange, 
  isProcessing = false 
}: VehicleTableProps) {
  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Car className="h-16 w-16 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">No vehicles found</p>
        <p className="text-sm text-muted-foreground">
          This driver hasn't added any vehicles yet
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <colgroup>
          <col className="w-[25%]" />
          <col className="w-[12%]" />
          <col className="w-[8%]" />
          <col className="w-[12%]" />
          <col className="w-[25%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="p-4 text-left text-sm font-semibold">Vehicle</th>
            <th className="p-4 text-left text-sm font-semibold">Plate</th>
            <th className="p-4 text-center text-sm font-semibold">Year</th>
            <th className="p-4 text-center text-sm font-semibold">Color</th>
            <th className="p-4 text-left text-sm font-semibold">Can Accept</th>
            <th className="p-4 text-center text-sm font-semibold">Status</th>
            <th className="p-4 text-right text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <VehicleRow
              key={vehicle.id}
              vehicle={vehicle}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
              isProcessing={isProcessing}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VehicleRow({
  vehicle,
  onEdit,
  onStatusChange,
  isProcessing,
}: {
  vehicle: Vehicle;
  onEdit: (vehicle: Vehicle) => void;
  onStatusChange: (vehicleId: string, status: string, reason?: string) => void;
  isProcessing: boolean;
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'suspended' || newStatus === 'inactive') {
      const reason = prompt(`Please provide a reason for ${newStatus} status:`);
      if (reason) {
        onStatusChange(vehicle.id, newStatus, reason);
      }
    } else {
      onStatusChange(vehicle.id, newStatus);
    }
  };

  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Car className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">{vehicle.model_name}</div>
            <div className="text-sm text-muted-foreground">
              {vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : 'Vehicle Details'}
            </div>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="font-mono text-sm">
          {vehicle.license_plate || 'N/A'}
        </div>
      </td>
      <td className="p-4 text-center">
        <div className="font-semibold">{vehicle.year}</div>
      </td>
      <td className="p-4">
        {getColorDisplay(vehicle.color_id)}
      </td>
      <td className="p-4">
        {getAllowedCategoriesDisplay(vehicle)}
      </td>
      <td className="p-4 text-center">
        <div className="flex flex-col items-center gap-1">
          {getStatusBadge(vehicle.status)}
          {vehicle.status_reason && (
            <div className="text-xs text-muted-foreground max-w-[150px] truncate">
              {vehicle.status_reason}
            </div>
          )}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={isProcessing}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(vehicle)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Vehicle
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                <Activity className="h-4 w-4 mr-2" />
                Set Active
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleStatusChange('maintenance')}>
                <Activity className="h-4 w-4 mr-2" />
                Set Maintenance
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleStatusChange('suspended')}>
                <Activity className="h-4 w-4 mr-2" />
                Set Suspended
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleStatusChange('inactive')}>
                <Activity className="h-4 w-4 mr-2" />
                Set Inactive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
