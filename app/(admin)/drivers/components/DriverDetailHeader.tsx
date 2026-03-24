"use client";

import { DriverAvatar } from "./DriverAvatar";
import { StatusBadge } from "./StatusBadge";
import { DriverInfo } from "./DriverInfo";
import { DriverMetaRow } from "./DriverMetaRow";
import { DriverHeaderActions } from "./DriverHeaderActions";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle, Mail, Phone, Building2, Ban, Star, Car, PoundSterling } from "lucide-react";

interface DriverDetailHeaderProps {
  driver: any;
  onRefresh?: () => void;
}

export function DriverDetailHeader({ driver, onRefresh }: DriverDetailHeaderProps) {
  const getInitials = () => {
    const fullName = driver.full_name || 'Driver';
    const names = fullName.split(' ');
    return names.length > 1 
      ? `${names[0][0]}${names[names.length-1][0]}`.toUpperCase()
      : fullName.substring(0, 2).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      complete: { variant: "default", icon: CheckCircle, label: "Complete" },
      pending: { variant: "secondary", icon: Clock, label: "Pending Review" },
      review: { variant: "secondary", icon: Clock, label: "Pending Review" },
      draft: { variant: "outline", icon: AlertTriangle, label: "Draft" },
      ok: { variant: "default", icon: CheckCircle, label: "Compliant" },
      missing: { variant: "destructive", icon: XCircle, label: "Missing Documents" },
      no_vehicle: { variant: "warning", icon: AlertTriangle, label: "No Vehicle" },
      expired: { variant: "destructive", icon: AlertTriangle, label: "Expired Documents" },
    };

    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0B0F14] p-8 shadow-2xl relative overflow-hidden">
      {/* Subtle gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-start justify-between gap-8 mb-8">
          {/* Left: Avatar + Info */}
          <div className="flex items-start gap-6">
            <DriverAvatar
              src={driver.profile_photo_url}
              alt={driver.full_name || 'Driver'}
              fallback={driver.full_name || 'Driver'}
              onlineStatus={driver.online_status}
            />
            
            <div className="flex-1 space-y-3">
              {/* Name */}
              <div>
                <h1 className="text-4xl font-bold text-white mb-1">
                  {driver.full_name || 'Driver'}
                </h1>
                <p className="text-sm text-gray-400">
                  {driver.driver_type || 'Driver'} • Member since {driver.created_at ? new Date(driver.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                </p>
              </div>

              {/* Contact Info - Single Row */}
              <div className="flex items-center gap-6 text-sm">
                {driver.email && (
                  <a 
                    href={`mailto:${driver.email}`}
                    className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{driver.email}</span>
                  </a>
                )}
                <a 
                  href={`tel:${driver.phone}`}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>{driver.phone}</span>
                </a>
                {driver.organization_name && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Building2 className="h-4 w-4" />
                    <span>{driver.organization_name}</span>
                  </div>
                )}
              </div>

              {/* Compact KPI Stats - Between Name and Status */}
              <div className="flex items-center gap-4 mt-4">
                {/* Rating */}
                <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-lg font-semibold text-white">0.0</span>
                </div>

                {/* Trips */}
                <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10">
                  <Car className="h-5 w-5 text-blue-500" />
                  <span className="text-lg font-semibold text-white">0</span>
                </div>

                {/* Earnings */}
                <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10">
                  <PoundSterling className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-semibold text-white">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Status Badge + Action Buttons */}
          <div className="flex flex-col items-end gap-3">
            {/* Status Badge + Three-dot Menu (same line) */}
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              {driver.status === 'approved' && (
                <Badge variant="default" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20 text-base px-4 py-2">
                  <CheckCircle className="h-4 w-4" />
                  Active
                </Badge>
              )}
              {driver.status === 'suspended' && (
                <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-base px-4 py-2">
                  <Ban className="h-4 w-4" />
                  Suspended
                </Badge>
              )}
              {driver.status === 'inactive' && (
                <Badge variant="outline" className="gap-1 bg-gray-500/10 text-gray-600 border-gray-500/20 text-base px-4 py-2">
                  <XCircle className="h-4 w-4" />
                  Inactive
                </Badge>
              )}
              {!driver.status || (driver.status !== 'approved' && driver.status !== 'suspended' && driver.status !== 'inactive') && (
                <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20 text-base px-4 py-2">
                  <Clock className="h-4 w-4" />
                  Pending
                </Badge>
              )}

              {/* Action Buttons (three-dot menu) */}
              {onRefresh && <DriverHeaderActions driver={driver} onRefresh={onRefresh} />}
            </div>

            {/* Status Reason */}
            {(driver.status === 'suspended' || driver.status === 'inactive') && driver.status_reason && (
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                {driver.status_reason}
              </p>
            )}
          </div>
        </div>

        {/* Meta Row */}
        <div className="border-t border-white/5 pt-4">
          <DriverMetaRow
            onlineStatus={driver.online_status}
            lastOnlineAt={driver.last_online_at}
            lastDeviceLoginAt={driver.last_device_login_at}
            locationUpdatedAt={driver.location_updated_at}
          />
        </div>
      </div>
    </div>
  );
}
