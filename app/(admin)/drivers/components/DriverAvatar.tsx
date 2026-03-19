"use client";

import { Avatar } from "@/components/ui/avatar";

interface DriverAvatarProps {
  src: string | null;
  alt: string;
  fallback: string;
  onlineStatus?: string;
}

export function DriverAvatar({ src, alt, fallback, onlineStatus }: DriverAvatarProps) {
  const getStatusColor = () => {
    switch (onlineStatus) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-orange-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="relative flex-shrink-0">
      <div className="rounded-full p-[3px] bg-gradient-to-br from-[#D4AF37] to-[#F4D03F] shadow-2xl shadow-[#D4AF37]/30">
        <div className="rounded-full bg-[#0B0F14] p-[2px]">
          <Avatar 
            src={src}
            alt={alt}
            fallback={fallback}
            className="h-32 w-32 text-2xl"
          />
        </div>
      </div>
      {/* Status Dot */}
      <div className="absolute bottom-1 right-1">
        <div className={`h-5 w-5 rounded-full ${getStatusColor()} border-[3px] border-[#0B0F14] shadow-lg`} />
      </div>
    </div>
  );
}
