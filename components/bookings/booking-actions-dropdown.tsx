"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import {
  AddNoteDialog,
  AssignDriverDialog,
  CancelBookingDialog,
  ChangeStatusDialog,
  EditTripDialog,
  EditVehicleDialog,
  ExtraChargeDialog,
  MarkPaidDialog,
  PaymentLinkDialog,
} from "@/components/bookings/booking-ops-dialogs";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  MoreVertical,
  Phone,
  Users,
  UserPlus,
  UserMinus,
  RefreshCw,
  Ban,
  CircleDot,
  MapPin,
  Car,
  StickyNote,
  Banknote,
  Link2,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Pencil,
  CreditCard,
  Contact,
  Share2,
  Star,
  Megaphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

interface BookingActionsDropdownProps {
  booking: Booking;
  onOpsDone?: () => void;
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

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

/** Mobile: expand inline in the same sheet. Desktop: flyout submenu. */
function MenuSection({
  narrow,
  label,
  icon,
  children,
  open,
  onOpenChange,
}: {
  narrow: boolean;
  label: string;
  icon: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (narrow) {
    return (
      <div className="py-0.5">
        <button
          type="button"
          // Prevent Radix from closing the root menu on accordion toggle
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onOpenChange(!open)}
          className={cn(
            "flex w-full min-h-11 items-center rounded-sm px-2 py-2.5 text-sm touch-manipulation",
            "hover:bg-accent focus:bg-accent outline-none",
            open && "bg-accent/60"
          )}
        >
          {icon}
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {open && (
          <div className="ml-2 border-l border-border/50 pl-1 py-0.5 space-y-0.5">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-0">
        {icon}
        <span className="flex-1">{label}</span>
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent sideOffset={6} className="w-56">
          {children}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

/** Nested tertiary group (Contact → Customer / Driver). */
function NestedSection({
  narrow,
  label,
  children,
  open,
  onOpenChange,
}: {
  narrow: boolean;
  label: string;
  children: ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (narrow) {
    return (
      <div>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onOpenChange(!open)}
          className={cn(
            "flex w-full min-h-10 items-center rounded-sm px-2 py-2 text-sm touch-manipulation",
            "hover:bg-accent focus:bg-accent outline-none text-muted-foreground",
            open && "bg-accent/40 text-foreground"
          )}
        >
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {open && <div className="ml-2 border-l border-border/40 pl-1">{children}</div>}
      </div>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <span className="flex-1">{label}</span>
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent sideOffset={6} className="w-52">
          {children}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

export function BookingActionsDropdown({ booking, onOpsDone }: BookingActionsDropdownProps) {
  const router = useRouter();
  const narrow = useIsNarrow();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);
  const [extraChargeOpen, setExtraChargeOpen] = useState(false);
  const [canReleasePremium, setCanReleasePremium] = useState(false);
  const [dispatchWave, setDispatchWave] = useState<string | null>(null);
  const [dispatchBusy, setDispatchBusy] = useState(false);

  // Mobile accordion sections
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [driverContactOpen, setDriverContactOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  async function refreshDispatchStatus() {
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/dispatch`);
      if (!res.ok) return;
      const data = await res.json();
      setCanReleasePremium(Boolean(data.canReleaseToPremium));
      setDispatchWave(data.active?.wave ?? null);
    } catch {
      /* ignore */
    }
  }

  const customerPhone = normalizePhoneForLink(booking.customer_phone);
  const driverPhone = normalizePhoneForLink(booking.driver_phone);
  const customerName = [booking.customer_first_name, booking.customer_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const driverName = booking.driver_name?.trim() || "Driver";
  const isCancelled = booking.status === "CANCELLED";
  const hasDriver = Boolean(booking.driver_name || booking.assigned_driver_id);

  function handleOpsDone() {
    onOpsDone?.();
    router.refresh();
    window.dispatchEvent(new CustomEvent("admin-bookings-refresh"));
  }

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

  function resetSections() {
    setEditOpen(false);
    setPaymentOpen(false);
    setContactOpen(false);
    setCustomerOpen(false);
    setDriverContactOpen(false);
    setShareOpen(false);
  }

  async function handleReleaseToPremium() {
    setDispatchBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release_premium" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Release failed");
      }
      toast({
        title: "Released to Premium",
        description: `Notified ${data.premium_drivers ?? "premium"} drivers. Auto-opens in ${data.premium_wait_minutes ?? 10} min if not taken.`,
      });
      await refreshDispatchStatus();
      handleOpsDone();
    } catch (err) {
      toast({
        title: "Release failed",
        description: err instanceof Error ? err.message : "Error",
        variant: "destructive",
      });
    } finally {
      setDispatchBusy(false);
    }
  }

  async function handleForceOpen() {
    setDispatchBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance_now" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Open failed");
      }
      toast({
        title: "Opened to all drivers",
        description: "Premium timer skipped — job is now on the open board.",
      });
      await refreshDispatchStatus();
      handleOpsDone();
    } catch (err) {
      toast({
        title: "Open failed",
        description: err instanceof Error ? err.message : "Error",
        variant: "destructive",
      });
    } finally {
      setDispatchBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) resetSections();
          else void refreshDispatchStatus();
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-md hover:bg-muted transition-colors touch-manipulation"
            disabled={isLoading}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Open booking actions</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          collisionPadding={12}
          className={cn(
            "w-[min(100vw-1.25rem,280px)] p-1.5",
            narrow && "max-h-[min(78dvh,520px)] overflow-y-auto overscroll-contain"
          )}
        >
          {/* ——— Primary ——— */}
          <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground px-2 py-1">
            Principal
          </DropdownMenuLabel>
          <DropdownMenuItem
            disabled={isCancelled}
            onClick={() => setAssignOpen(true)}
          >
            {hasDriver ? (
              <RefreshCw className="mr-2 h-4 w-4 shrink-0" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4 shrink-0" />
            )}
            <span>{hasDriver ? "Reassign driver" : "Assign driver"}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isCancelled || !canReleasePremium || dispatchBusy || hasDriver}
            onClick={() => void handleReleaseToPremium()}
          >
            <Star className="mr-2 h-4 w-4 shrink-0 text-amber-500" />
            <span>Release to Premium</span>
          </DropdownMenuItem>
          {dispatchWave === "premium" && !hasDriver && (
            <DropdownMenuItem
              disabled={isCancelled || dispatchBusy}
              onClick={() => void handleForceOpen()}
            >
              <Megaphone className="mr-2 h-4 w-4 shrink-0" />
              <span>Open to all now</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setStatusOpen(true)}>
            <CircleDot className="mr-2 h-4 w-4 shrink-0" />
            <span>Change status</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isCancelled}
            className="text-destructive focus:text-destructive"
            onClick={() => setCancelOpen(true)}
          >
            <Ban className="mr-2 h-4 w-4 shrink-0" />
            <span>Cancel booking</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* ——— Edit (secondary) ——— */}
          <MenuSection
            narrow={narrow}
            label="Edit"
            icon={<Pencil className="mr-2 h-4 w-4 shrink-0" />}
            open={editOpen}
            onOpenChange={setEditOpen}
          >
            <DropdownMenuItem
              disabled={isCancelled}
              onClick={() => setTripOpen(true)}
            >
              <MapPin className="mr-2 h-4 w-4 shrink-0" />
              <span>Edit trip</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isCancelled}
              onClick={() => setVehicleOpen(true)}
            >
              <Car className="mr-2 h-4 w-4 shrink-0" />
              <span>Edit vehicle</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setNoteOpen(true)}>
              <StickyNote className="mr-2 h-4 w-4 shrink-0" />
              <span>Internal note</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isCancelled || !hasDriver}
              onClick={() => setUnassignOpen(true)}
            >
              <UserMinus className="mr-2 h-4 w-4 shrink-0" />
              <span>Unassign driver</span>
            </DropdownMenuItem>
          </MenuSection>

          {/* ——— Payment (secondary) ——— */}
          <MenuSection
            narrow={narrow}
            label="Payment"
            icon={<CreditCard className="mr-2 h-4 w-4 shrink-0" />}
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
          >
            <DropdownMenuItem
              disabled={isCancelled}
              onClick={() => setMarkPaidOpen(true)}
            >
              <Banknote className="mr-2 h-4 w-4 shrink-0" />
              <span>Mark as paid</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isCancelled}
              onClick={() => setPaymentLinkOpen(true)}
            >
              <Link2 className="mr-2 h-4 w-4 shrink-0" />
              <span>Payment link</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isCancelled}
              onClick={() => setExtraChargeOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4 shrink-0" />
              <span>Extra charge</span>
            </DropdownMenuItem>
          </MenuSection>

          {/* ——— Contact (secondary → tertiary) ——— */}
          <MenuSection
            narrow={narrow}
            label="Contact"
            icon={<Contact className="mr-2 h-4 w-4 shrink-0" />}
            open={contactOpen}
            onOpenChange={setContactOpen}
          >
            <NestedSection
              narrow={narrow}
              label={customerName ? `Customer · ${customerName}` : "Customer"}
              open={customerOpen}
              onOpenChange={setCustomerOpen}
            >
              <DropdownMenuItem
                disabled={!customerPhone}
                onClick={() => openPhoneCall(booking.customer_phone)}
              >
                <Phone className="mr-2 h-4 w-4 shrink-0" />
                <span>{customerPhone ? "Call" : "No phone"}</span>
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
                <MessageCircle className="mr-2 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{customerPhone ? "WhatsApp" : "No WhatsApp"}</span>
              </DropdownMenuItem>
            </NestedSection>

            <NestedSection
              narrow={narrow}
              label={booking.driver_name ? `Driver · ${booking.driver_name}` : "Driver"}
              open={driverContactOpen}
              onOpenChange={setDriverContactOpen}
            >
              <DropdownMenuItem
                disabled={!driverPhone}
                onClick={() => openPhoneCall(booking.driver_phone)}
              >
                <Phone className="mr-2 h-4 w-4 shrink-0" />
                <span>
                  {driverPhone
                    ? "Call"
                    : booking.driver_name
                      ? "No phone"
                      : "Not assigned"}
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
                <MessageCircle className="mr-2 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  {driverPhone
                    ? "WhatsApp"
                    : booking.driver_name
                      ? "No WhatsApp"
                      : "Not assigned"}
                </span>
              </DropdownMenuItem>
            </NestedSection>
          </MenuSection>

          {/* ——— Share (secondary) ——— */}
          <MenuSection
            narrow={narrow}
            label="Share"
            icon={<Share2 className="mr-2 h-4 w-4 shrink-0" />}
            open={shareOpen}
            onOpenChange={setShareOpen}
          >
            <DropdownMenuItem onClick={handleSharePublic} disabled={isLoading}>
              <Users className="mr-2 h-4 w-4 shrink-0" />
              <span>Share Public</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSharePrivate} disabled={isLoading}>
              <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
              <span>Share Private</span>
            </DropdownMenuItem>
          </MenuSection>
        </DropdownMenuContent>
      </DropdownMenu>

      <AssignDriverDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        bookingId={booking.id}
        currentDriverName={booking.driver_name}
        mode="assign"
        onDone={handleOpsDone}
      />
      <AssignDriverDialog
        open={unassignOpen}
        onOpenChange={setUnassignOpen}
        bookingId={booking.id}
        currentDriverName={booking.driver_name}
        mode="unassign"
        onDone={handleOpsDone}
      />
      <ChangeStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        bookingId={booking.id}
        currentStatus={booking.status}
        onDone={handleOpsDone}
      />
      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        bookingId={booking.id}
        reference={booking.reference}
        onDone={handleOpsDone}
      />
      <EditTripDialog
        open={tripOpen}
        onOpenChange={setTripOpen}
        bookingId={booking.id}
        onDone={handleOpsDone}
      />
      <EditVehicleDialog
        open={vehicleOpen}
        onOpenChange={setVehicleOpen}
        bookingId={booking.id}
        onDone={handleOpsDone}
      />
      <AddNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        bookingId={booking.id}
        onDone={handleOpsDone}
      />
      <MarkPaidDialog
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        bookingId={booking.id}
        onDone={handleOpsDone}
      />
      <PaymentLinkDialog
        open={paymentLinkOpen}
        onOpenChange={setPaymentLinkOpen}
        bookingId={booking.id}
        onDone={handleOpsDone}
      />
      <ExtraChargeDialog
        open={extraChargeOpen}
        onOpenChange={setExtraChargeOpen}
        bookingId={booking.id}
        onDone={handleOpsDone}
      />
    </>
  );
}
