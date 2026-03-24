"use client";

import { useState } from "react";
import { Car, Users, MoreHorizontal, Edit, User, FileText, Trash2, Eye, Briefcase, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

interface VehicleTableProps {
  vehicles: Vehicle[];
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onAssign?: (vehicle: Vehicle) => void;
  onViewDocuments?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
}

const MODEL_LABELS: { [key: string]: string } = {
  "bmw-7-series": "BMW 7 Series",
  "mercedes-s-class": "Mercedes S Class",
  "mercedes-e-class": "Mercedes E Class",
  "bmw-5-series": "BMW 5 Series",
  "range-rover": "Range Rover",
  "mercedes-v-class": "Mercedes V Class"
};

const CATEGORY_LABELS: { [key: string]: string } = {
  luxury: "Luxury",
  executive: "Executive",
  suv: "SUV",
  mpv: "MPV"
};

const getCategoryIcon = (category: string) => {
  const icons: { [key: string]: any } = {
    luxury: Car,
    executive: Briefcase,
    suv: Truck,
    mpv: Users
  };
  const Icon = icons[category] || Car;
  return <Icon className="h-4 w-4 text-muted-foreground" />;
};

const STATUS_COLORS: { [key: string]: string } = {
  active: "default",
  inactive: "secondary",
  maintenance: "destructive",
  available: "outline",
  pending: "secondary"
};

const STATUS_LABELS: { [key: string]: string } = {
  active: "Active",
  inactive: "Inactive",
  maintenance: "Maintenance",
  available: "Available",
  pending: "Pending"
};

const COLORS: { [key: string]: string } = {
  black: "Black",
  white: "White",
  silver: "Silver",
  gray: "Gray",
  blue: "Blue",
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  orange: "Orange",
  brown: "Brown",
  champagne: "Champagne"
};

export function VehicleTable({ 
  vehicles, 
  onView, 
  onEdit, 
  onAssign, 
  onViewDocuments, 
  onDelete 
}: VehicleTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get unique values for filters
  const uniqueCategories = [...new Set(vehicles.map(v => v.category_id))];
  const uniqueModels = [...new Set(vehicles.map(v => v.model_id))];
  const uniqueYears = [...new Set(vehicles.map(v => v.year))].sort((a, b) => b - a);
  const uniqueStatuses = [...new Set(vehicles.map(v => v.status))];

  // Filter vehicles
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.driver_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || vehicle.category_id === categoryFilter;
    const matchesModel = modelFilter === "all" || vehicle.model_id === modelFilter;
    const matchesYear = yearFilter === "all" || vehicle.year.toString() === yearFilter;
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;

    return matchesSearch && matchesCategory && matchesModel && matchesYear && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setModelFilter("all");
    setYearFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchTerm || categoryFilter !== "all" || modelFilter !== "all" || yearFilter !== "all" || statusFilter !== "all";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            All Vehicles ({filteredVehicles.length} total)
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 min-w-full sm:min-w-[200px]">
            <Input
              placeholder="Search license plate or driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category}>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <span>{CATEGORY_LABELS[category]} ({vehicles.filter(v => v.category_id === category).length})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {uniqueModels.map(model => (
                <SelectItem key={model} value={model}>
                  {MODEL_LABELS[model]} ({vehicles.filter(v => v.model_id === model).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {uniqueYears.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year} ({vehicles.filter(v => v.year === year).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]} ({vehicles.filter(v => v.status === status).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Model</th>
                <th className="text-left p-3 font-medium">License</th>
                <th className="text-left p-3 font-medium">Driver</th>
                <th className="text-left p-3 font-medium">Organization</th>
                <th className="text-left p-3 font-medium">Year</th>
                <th className="text-left p-3 font-medium">Color</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {MODEL_LABELS[vehicle.model_id]}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-sm font-medium">
                      {vehicle.license_plate}
                    </span>
                  </td>
                  <td className="p-3">
                    {vehicle.driver_name ? (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{vehicle.driver_name}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Unassigned
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {vehicle.organization_name || 'Unknown'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm">{vehicle.year}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm">{COLORS[vehicle.color_id] || vehicle.color_id}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(vehicle.category_id)}
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[vehicle.category_id]}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant={STATUS_COLORS[vehicle.status] as any} className="text-xs">
                      {STATUS_LABELS[vehicle.status]}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(vehicle)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(vehicle)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Vehicle
                          </DropdownMenuItem>
                        )}
                        {onAssign && (
                          <DropdownMenuItem onClick={() => onAssign(vehicle)}>
                            <User className="h-4 w-4 mr-2" />
                            {vehicle.driver_id ? "Reassign Driver" : "Assign Driver"}
                          </DropdownMenuItem>
                        )}
                        {onViewDocuments && (
                          <DropdownMenuItem onClick={() => onViewDocuments(vehicle)}>
                            <FileText className="h-4 w-4 mr-2" />
                            View Documents
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem 
                            onClick={() => onDelete(vehicle)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Vehicle
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredVehicles.length === 0 && (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No vehicles found</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
