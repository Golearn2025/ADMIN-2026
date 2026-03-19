"use client";

import { MapPin, Smartphone } from "lucide-react";

interface DriverMetaRowProps {
  onlineStatus?: string;
  lastOnlineAt?: string;
  lastDeviceLoginAt?: string;
  locationUpdatedAt?: string;
}

export function DriverMetaRow({ 
  onlineStatus, 
  lastOnlineAt, 
  lastDeviceLoginAt,
  locationUpdatedAt 
}: DriverMetaRowProps) {
  const formatTimeAgo = (dateString: string | undefined) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex items-center gap-6 text-sm">
      {/* Online/Offline Status */}
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${
          onlineStatus === 'online' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-500'
        }`} />
        <span className={onlineStatus === 'online' ? 'text-green-500 font-medium' : 'text-gray-400'}>
          {onlineStatus === 'online' ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Separator */}
      {lastOnlineAt && <div className="h-4 w-px bg-gray-700" />}

      {/* Last Seen Date/Time */}
      {lastOnlineAt && (
        <div className="flex items-center gap-2 text-gray-400">
          <span>Last seen: {formatDateTime(lastOnlineAt)} ({formatTimeAgo(lastOnlineAt)})</span>
        </div>
      )}

      {/* Last Login */}
      {lastDeviceLoginAt && (
        <>
          <div className="flex items-center gap-2 text-gray-400">
            <Smartphone className="h-3.5 w-3.5" />
            <span>Last login: {formatTimeAgo(lastDeviceLoginAt)} on iPhone</span>
          </div>
          <div className="h-4 w-px bg-gray-700" />
        </>
      )}

      {/* Last Location Update */}
      {locationUpdatedAt && (
        <div className="flex items-center gap-2 text-gray-400">
          <MapPin className="h-3.5 w-3.5" />
          <span>Last location update</span>
        </div>
      )}
    </div>
  );
}
