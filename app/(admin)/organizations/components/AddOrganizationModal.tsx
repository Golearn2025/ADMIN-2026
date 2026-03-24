"use client";

import { useState } from "react";
import { Building2, Mail, Globe, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AddOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (orgData: any) => void;
}

export function AddOrganizationModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: AddOrganizationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    org_type: "",
    admin_email: "",
    timezone: "Europe/London",
    currency: "GBP"
  });

  const resetForm = () => {
    setFormData({
      name: "",
      org_type: "",
      admin_email: "",
      timezone: "Europe/London",
      currency: "GBP"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.org_type) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Organization "${formData.name}" created successfully!`);
        resetForm();
        onSuccess(data);
        onOpenChange(false);
      } else {
        alert(data.error || "Failed to create organization");
      }
    } catch (error) {
      alert("Error creating organization");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add New Organization
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization Name *
            </Label>
            <Input
              id="name"
              placeholder="e.g., Vantage Dubai"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          {/* Organization Type */}
          <div className="space-y-2">
            <Label htmlFor="org_type" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization Type *
            </Label>
            <Select 
              value={formData.org_type} 
              onValueChange={(value) => handleInputChange('org_type', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saas">SaaS</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Admin Email */}
          <div className="space-y-2">
            <Label htmlFor="admin_email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Admin Email (Optional)
            </Label>
            <Input
              id="admin_email"
              type="email"
              placeholder="admin@organization.com"
              value={formData.admin_email}
              onChange={(e) => handleInputChange('admin_email', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This user will be added as organization admin
            </p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timezone
            </Label>
            <Select 
              value={formData.timezone} 
              onValueChange={(value) => handleInputChange('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/London">Europe/London</SelectItem>
                <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                <SelectItem value="Europe/Rome">Europe/Rome</SelectItem>
                <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                <SelectItem value="Europe/Amsterdam">Europe/Amsterdam</SelectItem>
                <SelectItem value="Europe/Brussels">Europe/Brussels</SelectItem>
                <SelectItem value="Europe/Vienna">Europe/Vienna</SelectItem>
                <SelectItem value="Europe/Zurich">Europe/Zurich</SelectItem>
                <SelectItem value="Europe/Stockholm">Europe/Stockholm</SelectItem>
                <SelectItem value="Europe/Oslo">Europe/Oslo</SelectItem>
                <SelectItem value="Europe/Copenhagen">Europe/Copenhagen</SelectItem>
                <SelectItem value="Europe/Helsinki">Europe/Helsinki</SelectItem>
                <SelectItem value="Europe/Warsaw">Europe/Warsaw</SelectItem>
                <SelectItem value="Europe/Prague">Europe/Prague</SelectItem>
                <SelectItem value="Europe/Budapest">Europe/Budapest</SelectItem>
                <SelectItem value="Europe/Bucharest">Europe/Bucharest</SelectItem>
                <SelectItem value="Europe/Sofia">Europe/Sofia</SelectItem>
                <SelectItem value="Europe/Athens">Europe/Athens</SelectItem>
                <SelectItem value="Europe/Istanbul">Europe/Istanbul</SelectItem>
                <SelectItem value="Europe/Moscow">Europe/Moscow</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                <SelectItem value="Asia/Abu_Dhabi">Asia/Abu Dhabi</SelectItem>
                <SelectItem value="Asia/Qatar">Asia/Qatar</SelectItem>
                <SelectItem value="Asia/Kuwait">Asia/Kuwait</SelectItem>
                <SelectItem value="Asia/Riyadh">Asia/Riyadh</SelectItem>
                <SelectItem value="America/New_York">America/New_York</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                <SelectItem value="America/Chicago">America/Chicago</SelectItem>
                <SelectItem value="America/Toronto">America/Toronto</SelectItem>
                <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
                <SelectItem value="Pacific/Auckland">Pacific/Auckland</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Currency
            </Label>
            <Select 
              value={formData.currency} 
              onValueChange={(value) => handleInputChange('currency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="CHF">CHF (Fr)</SelectItem>
                <SelectItem value="AED">AED (د.إ)</SelectItem>
                <SelectItem value="SAR">SAR (﷼)</SelectItem>
                <SelectItem value="QAR">QAR (ر.ق)</SelectItem>
                <SelectItem value="KWD">KWD (د.ك)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
