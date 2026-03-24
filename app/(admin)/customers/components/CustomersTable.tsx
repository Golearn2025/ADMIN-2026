"use client";

import { useState } from "react";
import { Users, MoreHorizontal, Eye, Edit, Mail, Phone, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Customer {
  customer_id: string;
  auth_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  profile_photo_url: string | null;
  saved_address: any;
  is_active: boolean;
  organization_id: string;
  organization_name?: string;
  customer_created_at: string;
  customer_updated_at: string;
  temperature_preference: string | null;
  music_preference: string | null;
  communication_style: string | null;
  pet_friendly_default: boolean | null;
}

interface CustomersTableProps {
  customers: Customer[];
  onView?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onEmail?: (customer: Customer) => void;
  onCall?: (customer: Customer) => void;
  onToggleStatus?: (customer: Customer) => void;
}

export function CustomersTable({ 
  customers, 
  onView, 
  onEdit, 
  onEmail, 
  onCall,
  onToggleStatus 
}: CustomersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && customer.is_active) ||
      (statusFilter === "inactive" && !customer.is_active);

    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all";

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const activeCount = customers.filter(c => c.is_active).length;
  const inactiveCount = customers.filter(c => !c.is_active).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Customers ({filteredCustomers.length} total)
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
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status ({customers.length})</SelectItem>
              <SelectItem value="active">Active ({activeCount})</SelectItem>
              <SelectItem value="inactive">Inactive ({inactiveCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Organization</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Joined</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.customer_id} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {customer.profile_photo_url ? (
                        <img 
                          src={customer.profile_photo_url} 
                          alt={`${customer.first_name} ${customer.last_name}`}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {customer.first_name?.[0]}{customer.last_name?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {customer.first_name} {customer.last_name}
                        </p>
                        {customer.date_of_birth && (
                          <p className="text-xs text-muted-foreground">
                            DOB: {formatDate(customer.date_of_birth)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm">{customer.email}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {customer.phone || 'N/A'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {customer.organization_name || 'Unknown'}
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge 
                      variant={customer.is_active ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {customer.is_active ? (
                        <><UserCheck className="h-3 w-3 mr-1" /> Active</>
                      ) : (
                        <><UserX className="h-3 w-3 mr-1" /> Inactive</>
                      )}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(customer.customer_created_at)}
                    </span>
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
                          <DropdownMenuItem onClick={() => onView(customer)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(customer)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Customer
                          </DropdownMenuItem>
                        )}
                        {onEmail && (
                          <DropdownMenuItem onClick={() => onEmail(customer)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                        )}
                        {onCall && customer.phone && (
                          <DropdownMenuItem onClick={() => onCall(customer)}>
                            <Phone className="h-4 w-4 mr-2" />
                            Call Customer
                          </DropdownMenuItem>
                        )}
                        {onToggleStatus && (
                          <DropdownMenuItem onClick={() => onToggleStatus(customer)}>
                            {customer.is_active ? (
                              <><UserX className="h-4 w-4 mr-2" /> Deactivate</>
                            ) : (
                              <><UserCheck className="h-4 w-4 mr-2" /> Activate</>
                            )}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredCustomers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No customers found</p>
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
