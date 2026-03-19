"use client";

import { CheckCircle } from "lucide-react";

interface StatusBadgeProps {
  type: 'online' | 'available' | 'profile_complete';
  value?: boolean;
}

export function StatusBadge({ type, value = true }: StatusBadgeProps) {
  if (!value && type !== 'online') return null;

  const configs = {
    online: {
      icon: '●',
      label: 'ONLINE',
      bgColor: 'bg-green-500/15',
      borderColor: 'border-green-500/40',
      textColor: 'text-green-400',
      iconColor: 'text-green-400',
    },
    available: {
      icon: '✓',
      label: 'AVAILABLE',
      bgColor: 'bg-green-500/15',
      borderColor: 'border-green-500/40',
      textColor: 'text-green-400',
      iconColor: 'text-green-400',
    },
    profile_complete: {
      icon: '✓',
      label: 'PROFILE COMPLETE',
      bgColor: 'bg-white/5',
      borderColor: 'border-white/10',
      textColor: 'text-gray-400',
      iconColor: 'text-gray-400',
    },
  };

  const config = configs[type];

  return (
    <div className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} backdrop-blur-sm`}>
      <span className={`text-base font-bold ${config.iconColor}`}>
        {config.icon}
      </span>
      <span className={`text-sm font-bold tracking-wide ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
}
