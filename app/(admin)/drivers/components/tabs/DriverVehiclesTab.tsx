"use client";

import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Calendar, 
  Hash,
  Palette,
  Tag,
  Activity,
  Clock,
  Shield
} from "lucide-react";

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
}

interface DriverVehiclesTabProps {
  vehicles: Vehicle[];
}

export function DriverVehiclesTab({ vehicles }: DriverVehiclesTabProps) {
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

  const getCategoryBadge = (categoryId: string) => {
    const categories: Record<string, { label: string; variant: any; color: string }> = {
      luxury: { label: 'Luxury', variant: 'default', color: 'text-purple-500' },
      executive: { label: 'Executive', variant: 'default', color: 'text-blue-500' },
      standard: { label: 'Standard', variant: 'secondary', color: 'text-gray-500' },
      economy: { label: 'Economy', variant: 'outline', color: 'text-green-500' },
      suv: { label: 'SUV', variant: 'secondary', color: 'text-orange-500' },
      van: { label: 'Van', variant: 'secondary', color: 'text-teal-500' },
    };
    
    const category = categories[categoryId] || { label: categoryId, variant: 'secondary', color: 'text-gray-500' };
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
    <div className="space-y-6">
      {vehicles.map((vehicle) => (
        <div key={vehicle.id} className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Header with vehicle name and status */}
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Car className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="text-xl font-bold">{vehicle.model_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : 'Vehicle Details'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getCategoryBadge(vehicle.category_id)}
                {getStatusBadge(vehicle.status)}
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Basic Information */}
              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  Year
                </dt>
                <dd className="text-lg font-semibold">{vehicle.year}</dd>
              </div>

              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Hash className="h-4 w-4" />
                  License Plate
                </dt>
                <dd className="text-lg font-semibold font-mono">
                  {vehicle.license_plate || 'N/A'}
                </dd>
              </div>

              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Palette className="h-4 w-4" />
                  Color
                </dt>
                <dd className="mt-1">
                  {getColorDisplay(vehicle.color_id)}
                </dd>
              </div>

              {/* Category */}
              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Tag className="h-4 w-4" />
                  Category
                </dt>
                <dd className="mt-1">
                  {getCategoryBadge(vehicle.category_id)}
                </dd>
              </div>

              {/* Status */}
              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Activity className="h-4 w-4" />
                  Status
                </dt>
                <dd className="mt-1">
                  {getStatusBadge(vehicle.status)}
                </dd>
              </div>

              {/* Status Changed */}
              <div>
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Clock className="h-4 w-4" />
                  Status Changed
                </dt>
                <dd className="text-sm">
                  {formatDate(vehicle.status_changed_at)}
                </dd>
              </div>
            </div>

            {/* Status Reason if exists */}
            {vehicle.status_reason && (
              <div className="mt-6 rounded-lg bg-muted/50 p-4">
                <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Shield className="h-4 w-4" />
                  Status Reason
                </dt>
                <dd className="text-sm">{vehicle.status_reason}</dd>
              </div>
            )}

            {/* System Information */}
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">System Information</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Vehicle ID</dt>
                  <dd className="text-xs font-mono text-muted-foreground break-all mt-1">
                    {vehicle.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Model ID</dt>
                  <dd className="text-xs font-mono text-muted-foreground mt-1">
                    {vehicle.model_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd className="text-xs text-muted-foreground mt-1">
                    {formatDate(vehicle.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Last Updated</dt>
                  <dd className="text-xs text-muted-foreground mt-1">
                    {formatDate(vehicle.updated_at)}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
