"use client";

import { useState, useEffect } from "react";
import { Users, Download, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { CustomerStatsCards } from "./components/CustomerStatsCards";
import { CustomersTable } from "./components/CustomersTable";
import { apiFetch } from "@/lib/api/apiClient";

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

interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const response = await apiFetch('/api/admin/customers');
      const data = await response.json();
      
      if (response.ok) {
        setCustomers(data.customers || []);
      } else {
        alert('Failed to fetch customers');
      }
    } catch (error) {
      alert('Error fetching customers');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (): CustomerStats => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: customers.length,
      active: customers.filter(c => c.is_active).length,
      inactive: customers.filter(c => !c.is_active).length,
      newThisMonth: customers.filter(c => 
        new Date(c.customer_created_at) >= firstDayOfMonth
      ).length
    };
  };

  // Handle customer actions
  const handleViewCustomer = (customer: Customer) => {
    alert('View customer details coming soon');
  };

  const handleEditCustomer = (customer: Customer) => {
    alert('Edit customer functionality coming soon');
  };

  const handleEmailCustomer = (customer: Customer) => {
    window.location.href = `mailto:${customer.email}`;
  };

  const handleCallCustomer = (customer: Customer) => {
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
  };

  const handleToggleStatus = (customer: Customer) => {
    alert('Toggle customer status coming soon');
  };

  const handleExport = () => {
    alert('Export functionality coming soon');
  };

  const handleAddCustomer = () => {
    alert('Add customer functionality coming soon');
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const stats = calculateStats();

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Customers"
          subtitle="Manage customer accounts and profiles"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" onClick={handleAddCustomer}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </>
          }
        />
        <div className="flex items-center justify-center py-12">
          <Users className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage customer accounts and profiles"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={handleAddCustomer}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </>
        }
      />

      <div className="space-y-4 md:space-y-6">
        {/* Statistics Cards */}
        <CustomerStatsCards stats={stats} />

        {/* Customers Table */}
        <CustomersTable
          customers={customers}
          onView={handleViewCustomer}
          onEdit={handleEditCustomer}
          onEmail={handleEmailCustomer}
          onCall={handleCallCustomer}
          onToggleStatus={handleToggleStatus}
        />
      </div>
    </div>
  );
}
