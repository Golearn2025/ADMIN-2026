"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { Download, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/common";
import { DataTableShell } from "@/components/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api/apiClient";
import { CustomerStatsCards } from "./components/CustomerStatsCards";
import { createColumns, type Customer } from "./customers.columns";

interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
}

const EMPTY_STATS: CustomerStats = {
  total: 0,
  active: 0,
  inactive: 0,
  newThisMonth: 0,
};

const EMPTY_FORM = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  invite: true,
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>(EMPTY_STATS);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDeferredValue(searchValue);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [refreshKey, setRefreshKey] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(debouncedSearch.trim() && { q: debouncedSearch.trim() }),
        });

        const response = await apiFetch(`/api/admin/customers?${params}`);
        const data = await response.json();

        if (response.ok) {
          setCustomers(data.customers || []);
          setTotal(data.total ?? data.customers?.length ?? 0);
          if (data.stats) setStats(data.stats);
        } else {
          console.error("Failed to fetch customers:", data.error);
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [page, pageSize, debouncedSearch, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleViewCustomer = () => {
    alert("View customer details coming soon");
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({
      email: customer.email || "",
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      phone: customer.phone || "",
    });
    setEditError(null);
    setEditOpen(true);
  };

  const handleEmailCustomer = (customer: Customer) => {
    window.location.href = `mailto:${customer.email}`;
  };

  const handleCallCustomer = (customer: Customer) => {
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    try {
      const response = await apiFetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          is_active: !customer.is_active,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        window.alert(result.error || "Failed to update customer status");
        return;
      }
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Toggle status error:", error);
      window.alert("Failed to update customer status");
    }
  };

  const handleResetPassword = async (customer: Customer) => {
    try {
      const response = await apiFetch("/api/admin/customers/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customer.customer_id }),
      });
      const result = await response.json();
      if (!response.ok) {
        window.alert(result.error || "Failed to generate reset link");
        return;
      }

      const link = result.action_link as string;
      const copied = await navigator.clipboard
        .writeText(link)
        .then(() => true)
        .catch(() => false);

      window.alert(
        copied
          ? `Password reset link copied to clipboard:\n\n${link}`
          : `Password reset link (copy manually):\n\n${link}`
      );
    } catch (error) {
      console.error("Reset password error:", error);
      window.alert("Failed to generate reset link");
    }
  };

  const handleAddCustomer = async () => {
    setAddError(null);
    const email = addForm.email.trim().toLowerCase();
    const firstName = addForm.first_name.trim();
    if (!email || !email.includes("@")) {
      setAddError("Enter a valid email address");
      return;
    }
    if (!firstName) {
      setAddError("First name is required");
      return;
    }

    setAddSubmitting(true);
    try {
      const response = await apiFetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: addForm.last_name.trim(),
          phone: addForm.phone.trim() || undefined,
          invite: addForm.invite,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setAddError(result.error || "Failed to create customer");
        return;
      }

      setAddOpen(false);
      setAddForm(EMPTY_FORM);
      setRefreshKey((k) => k + 1);
      if (result.warning) {
        window.alert(`Created with note: ${result.warning}`);
      }
    } catch (error) {
      console.error("Add customer error:", error);
      setAddError("Failed to create customer");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    setEditError(null);

    const email = editForm.email.trim().toLowerCase();
    const firstName = editForm.first_name.trim();
    if (!email || !email.includes("@")) {
      setEditError("Enter a valid email address");
      return;
    }
    if (!firstName) {
      setEditError("First name is required");
      return;
    }

    setEditSubmitting(true);
    try {
      const response = await apiFetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: editingCustomer.customer_id,
          email,
          first_name: firstName,
          last_name: editForm.last_name.trim(),
          phone: editForm.phone.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setEditError(result.error || "Failed to update customer");
        return;
      }

      setEditOpen(false);
      setEditingCustomer(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Edit customer error:", error);
      setEditError("Failed to update customer");
    } finally {
      setEditSubmitting(false);
    }
  };

  const columns = createColumns({
    onView: handleViewCustomer,
    onEdit: handleEditCustomer,
    onEmail: handleEmailCustomer,
    onCall: handleCallCustomer,
    onToggleStatus: handleToggleStatus,
    onResetPassword: handleResetPassword,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Manage customer accounts and profiles"
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
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </>
        }
      />

      <div className="space-y-4 px-3 sm:px-4 md:px-6 md:space-y-6">
        <CustomerStatsCards stats={stats} />

        <DataTableShell
          columns={columns}
          rows={customers}
          totalRows={total}
          isLoading={isLoading}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by name, email, or phone..."
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          emptyIcon={Users}
          emptyTitle="No customers found"
          emptyDescription="No customers match your search criteria."
        />
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setAddError(null);
            setAddForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-customer-email">Email</Label>
              <Input
                id="add-customer-email"
                type="email"
                className="w-full"
                placeholder="customer@email.com"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                }
                disabled={addSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-customer-first">First name</Label>
              <Input
                id="add-customer-first"
                className="w-full"
                value={addForm.first_name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, first_name: e.target.value }))
                }
                disabled={addSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-customer-last">Last name</Label>
              <Input
                id="add-customer-last"
                className="w-full"
                value={addForm.last_name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, last_name: e.target.value }))
                }
                disabled={addSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-customer-phone">Phone</Label>
              <Input
                id="add-customer-phone"
                className="w-full"
                type="tel"
                value={addForm.phone}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, phone: e.target.value }))
                }
                disabled={addSubmitting}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="add-customer-invite"
                checked={addForm.invite}
                onCheckedChange={(checked) =>
                  setAddForm((f) => ({ ...f, invite: checked === true }))
                }
                disabled={addSubmitting}
              />
              <Label htmlFor="add-customer-invite" className="font-normal">
                Invite to customer portal
              </Label>
            </div>
            {addError ? (
              <p className="text-sm text-destructive">{addError}</p>
            ) : null}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setAddOpen(false)}
              disabled={addSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleAddCustomer}
              disabled={addSubmitting}
            >
              {addSubmitting ? "Creating…" : "Create customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditError(null);
            setEditingCustomer(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-customer-email">Email</Label>
              <Input
                id="edit-customer-email"
                type="email"
                className="w-full"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
                disabled={editSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-customer-first">First name</Label>
              <Input
                id="edit-customer-first"
                className="w-full"
                value={editForm.first_name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, first_name: e.target.value }))
                }
                disabled={editSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-customer-last">Last name</Label>
              <Input
                id="edit-customer-last"
                className="w-full"
                value={editForm.last_name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, last_name: e.target.value }))
                }
                disabled={editSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-customer-phone">Phone</Label>
              <Input
                id="edit-customer-phone"
                className="w-full"
                type="tel"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
                disabled={editSubmitting}
              />
            </div>
            {editError ? (
              <p className="text-sm text-destructive">{editError}</p>
            ) : null}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setEditOpen(false)}
              disabled={editSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleSaveEdit}
              disabled={editSubmitting}
            >
              {editSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
