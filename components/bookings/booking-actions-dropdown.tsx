"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Booking } from "@/app/(admin)/bookings/types";
import {
  getPrivateShareTemplate,
  getPublicShareTemplate,
  openWhatsApp,
  type BookingShareContext,
} from "@/lib/utils/whatsapp-templates";
import { normalizePhoneForLink, openPhoneCall, openWhatsAppChat } from "@/lib/utils/phone-links";
import { MessageCircle, MoreVertical, Phone, Users } from "lucide-react";
import { useState } from "react";

interface BookingActionsDropdownProps {
  booking: Booking;
}

async function fetchShareContext(
  bookingId: string
): Promise<BookingShareContext | null> {
  try {
    const response = await fetch(
      `/api/admin/bookings/${bookingId}/share-context`
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export function BookingActionsDropdown({ booking }: BookingActionsDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);

  const customerPhone = normalizePhoneForLink(booking.customer_phone);
  const driverPhone = normalizePhoneForLink(booking.driver_phone);
  const customerName = [booking.customer_first_name, booking.customer_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const driverName = booking.driver_name?.trim() || "Driver";

  const handleSharePublic = async () => {
    setIsLoading(true);
    try {
      const ctx = await fetchShareContext(booking.id);
      const message = getPublicShareTemplate(booking, null, ctx);
      await openWhatsApp(message);
    } catch (error) {
      console.error("Error sharing booking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSharePrivate = async () => {
    setIsLoading(true);
    try {
      const ctx = await fetchShareContext(booking.id);
      const message = getPrivateShareTemplate(booking, null, ctx);
      await openWhatsApp(message);
    } catch (error) {
      console.error("Error sharing booking:", error);
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
      <DropdownMenuContent align="end" className="w-[230px]">
        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
          Customer{customerName ? ` · ${customerName}` : ""}
        </DropdownMenuLabel>
        <DropdownMenuItem
          disabled={!customerPhone}
          onClick={() => openPhoneCall(booking.customer_phone)}
        >
          <Phone className="mr-2 h-4 w-4" />
          <span>{customerPhone ? "Call customer" : "No customer phone"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!customerPhone}
          onClick={() =>
            openWhatsAppChat(
              booking.customer_phone,
              `Hi${customerName ? ` ${customerName}` : ""}, regarding booking ${booking.reference}…`
            )
          }
        >
          <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
          <span>{customerPhone ? "WhatsApp customer" : "No customer WhatsApp"}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
          Driver{booking.driver_name ? ` · ${booking.driver_name}` : ""}
        </DropdownMenuLabel>
        <DropdownMenuItem
          disabled={!driverPhone}
          onClick={() => openPhoneCall(booking.driver_phone)}
        >
          <Phone className="mr-2 h-4 w-4" />
          <span>
            {driverPhone
              ? "Call driver"
              : booking.driver_name
                ? "No driver phone"
                : "No driver assigned"}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!driverPhone}
          onClick={() =>
            openWhatsAppChat(
              booking.driver_phone,
              `Hi ${driverName}, regarding job ${booking.reference}…`
            )
          }
        >
          <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
          <span>
            {driverPhone
              ? "WhatsApp driver"
              : booking.driver_name
                ? "No driver WhatsApp"
                : "No driver assigned"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
          Share
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handleSharePublic} disabled={isLoading}>
          <Users className="mr-2 h-4 w-4" />
          <span>Share Public</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSharePrivate} disabled={isLoading}>
          <MessageCircle className="mr-2 h-4 w-4" />
          <span>Share Private</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
