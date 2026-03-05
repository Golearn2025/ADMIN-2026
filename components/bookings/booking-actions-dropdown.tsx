"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Booking } from "@/app/(admin)/bookings/types";
import { getPrivateShareTemplate, getPublicShareTemplate, openWhatsApp } from "@/lib/utils/whatsapp-templates";
import { MessageCircle, MoreVertical, Users } from "lucide-react";
import { useState } from "react";

interface BookingActionsDropdownProps {
  booking: Booking;
}

interface BookingExtras {
  included_services_json?: string[];
  paid_upgrades_json?: Record<string, unknown>;
  premium_features_json?: Record<string, unknown>;
  additional_stops_json?: Array<{ address: string; order?: number }> | null;
}

export function BookingActionsDropdown({ booking }: BookingActionsDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSharePublic = async () => {
    setIsLoading(true);
    try {
      // Fetch extras (read-only)
      const response = await fetch(`/api/admin/bookings/${booking.id}/extras`);
      let extras: BookingExtras | null = null;
      
      if (response.ok) {
        extras = await response.json();
      }

      // Generate template și deschide WhatsApp
      const message = getPublicShareTemplate(booking, extras);
      openWhatsApp(message);
    } catch (error) {
      console.error('Error sharing booking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSharePrivate = async () => {
    setIsLoading(true);
    try {
      // Fetch extras (read-only)
      const response = await fetch(`/api/admin/bookings/${booking.id}/extras`);
      let extras: BookingExtras | null = null;
      
      if (response.ok) {
        extras = await response.json();
      }

      // Generate template și deschide WhatsApp
      const message = getPrivateShareTemplate(booking, extras);
      openWhatsApp(message);
    } catch (error) {
      console.error('Error sharing booking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          disabled={isLoading}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Open booking actions</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={handleSharePublic} disabled={isLoading}>
          <Users className="mr-2 h-4 w-4" />
          <span>Share Public</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSharePrivate} disabled={isLoading}>
          <MessageCircle className="mr-2 h-4 w-4" />
          <span>Share Private</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
