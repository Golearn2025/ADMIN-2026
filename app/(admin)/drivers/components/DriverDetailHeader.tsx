"use client";

import { DriverAvatar } from "./DriverAvatar";
import { StatusBadge } from "./StatusBadge";
import { DriverInfo } from "./DriverInfo";
import { DriverMetaRow } from "./DriverMetaRow";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle, Mail, Phone, Building2 } from "lucide-react";

interface DriverDetailHeaderProps {
  driver: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    profile_photo_url: string | null;
    organization_id: string;
    organization_name?: string;
    driver_type?: string;
    onboarding_status: string;
    compliance_status: string;
    is_approved: boolean;
    can_receive_jobs: boolean;
    total_vehicles?: number;
    online_status?: string;
    last_online_at?: string;
    is_available?: boolean;
    profile_completed?: boolean;
    last_device_login_at?: string;
    location_updated_at?: string;
    created_at?: string;
  };
}

export function DriverDetailHeader({ driver }: DriverDetailHeaderProps) {
  const getInitials = () => {
    const names = driver.full_name.split(' ');
    return names.length > 1 
      ? `${names[0][0]}${names[names.length-1][0]}`.toUpperCase()
      : driver.full_name.substring(0, 2).toUpperCase();
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
              alt={driver.full_name}
              fallback={driver.full_name}
              onlineStatus={driver.online_status}
            />
            
            <div className="flex-1 space-y-3">
              {/* Name */}
              <div>
                <h1 className="text-4xl font-bold text-white mb-1">
                  {driver.full_name}
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
            </div>
          </div>

          {/* Right: Status Badges */}
          <div className="flex flex-wrap items-start justify-end gap-2">
            {driver.online_status === 'online' && (
              <StatusBadge type="online" value={true} />
            )}
            {driver.is_available && (
              <StatusBadge type="available" value={driver.is_available} />
            )}
            {driver.profile_completed && (
              <StatusBadge type="profile_complete" value={driver.profile_completed} />
            )}
            {getStatusBadge(driver.onboarding_status)}
            {getStatusBadge(driver.compliance_status)}
            {driver.is_approved && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Approved
              </Badge>
            )}
            {driver.can_receive_jobs && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Authorized
              </Badge>
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
