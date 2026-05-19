import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentOrg } from "@/lib/auth/org";

const PRICING_MANAGER_ROLES = new Set(["root", "owner", "admin"]);

/** Super-admin (auth.users) sau root/owner/admin în org curentă. */
export async function canManagePricing(
  supabase: SupabaseClient,
  userId: string,
  isSuperAdmin: boolean
): Promise<boolean> {
  if (isSuperAdmin) return true;

  const orgId = await getCurrentOrg(supabase, userId);
  if (!orgId) return false;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();

  return membership?.role ? PRICING_MANAGER_ROLES.has(membership.role) : false;
}
