import type { SupabaseClient } from "@supabase/supabase-js";

export type LogAdminActivityInput = {
  bookingId: string;
  bookingLegId?: string | null;
  organizationId?: string | null;
  actionType: string;
  reasonCode?: string | null;
  reasonText?: string | null;
  fromValue?: Record<string, unknown> | null;
  toValue?: Record<string, unknown> | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logBookingAdminActivity(
  admin: SupabaseClient,
  input: LogAdminActivityInput
) {
  const { error } = await admin.from("booking_admin_activity").insert({
    booking_id: input.bookingId,
    booking_leg_id: input.bookingLegId ?? null,
    organization_id: input.organizationId ?? null,
    action_type: input.actionType,
    reason_code: input.reasonCode ?? null,
    reason_text: input.reasonText ?? null,
    from_value: input.fromValue ?? null,
    to_value: input.toValue ?? null,
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail ?? null,
    actor_name: input.actorName ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[booking_admin_activity] insert failed:", error.message);
    throw new Error(`Failed to write activity log: ${error.message}`);
  }
}
