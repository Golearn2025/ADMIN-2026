"use client";

import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Calendar, 
  Shield, 
  Activity, 
  Car,
  Hash,
  Building2,
  Clock
} from "lucide-react";
import type { Driver } from "@/lib/features/drivers/drivers.types";

interface DriverDetailsTabProps {
  driver: Driver;
}

export function DriverDetailsTab({ driver }: DriverDetailsTabProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const getOnlineStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge variant="success" className="gap-1">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          Online
        </Badge>;
      case 'busy':
        return <Badge variant="warning" className="gap-1">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          Busy
        </Badge>;
      default:
        return <Badge variant="secondary" className="gap-1">
          <div className="h-2 w-2 rounded-full bg-gray-500" />
          Offline
        </Badge>;
    }
  };


  return (
    <div className="space-y-6">
      {/* Account Information */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <User className="h-5 w-5" />
          Account Information
        </h3>
        
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Member Since
            </dt>
            <dd className="mt-1 text-sm">
              <div className="font-medium">{formatDate(driver.member_since || driver.created_at)}</div>
              <div className="text-xs text-muted-foreground">
                {getRelativeTime(driver.member_since || driver.created_at)}
              </div>
            </dd>
          </div>

          
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Organization
            </dt>
            <dd className="mt-1 text-sm font-mono text-xs truncate">
              {driver.organization_id}
            </dd>
          </div>
        </dl>
      </div>

      {/* Activity & Availability */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5" />
          Activity & Availability
        </h3>
        
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              Online Status
            </dt>
            <dd className="mt-1">
              {getOnlineStatusBadge(driver.online_status)}
            </dd>
          </div>

          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              Can Receive Jobs
            </dt>
            <dd className="mt-1">
              <Badge variant={driver.can_receive_jobs ? "success" : "destructive"}>
                {driver.can_receive_jobs ? "Yes" : "No"}
              </Badge>
            </dd>
          </div>

          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Car className="h-4 w-4" />
              Total Vehicles
            </dt>
            <dd className="mt-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{driver.total_vehicles}</span>
                <span className="text-sm text-muted-foreground">
                  {driver.total_vehicles === 1 ? 'vehicle' : 'vehicles'}
                </span>
              </div>
            </dd>
          </div>

          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              Onboarding Status
            </dt>
            <dd className="mt-1">
              <Badge variant={driver.onboarding_status === 'complete' ? 'success' : 'warning'}>
                {driver.onboarding_status}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>

      {/* System Information */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Hash className="h-5 w-5" />
          System Information
        </h3>
        
        <dl className="grid gap-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Driver ID
            </dt>
            <dd className="mt-1 font-mono text-xs text-muted-foreground break-all">
              {driver.id}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Compliance Status
            </dt>
            <dd className="mt-1">
              <Badge 
                variant={
                  driver.compliance_status === 'ok' ? 'success' :
                  driver.compliance_status === 'expired' ? 'destructive' :
                  driver.compliance_status === 'no_vehicle' ? 'warning' :
                  'destructive'
                }
              >
                {driver.compliance_status}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
