import { createClient } from "@/lib/supabase/server";

export type UserRole = "root" | "owner" | "admin" | "member" | "guest";

const ALLOWED_ROLES: UserRole[] = ["root", "owner", "admin"];

export interface UserRoleInfo {
  role: UserRole | null;
  orgId: string | null;
  hasAccess: boolean;
  isSuperAdmin?: boolean;
}

export async function getUserRole(): Promise<UserRoleInfo> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { role: null, orgId: null, hasAccess: false };
  }

  // Check if user is super admin using service role to bypass RLS
  const { data: userData } = await supabase
    .rpc('get_user_super_admin_status', { user_id: user.id });

  const isSuperAdmin = userData || false;

  // If super admin, return access without organization restriction
  if (isSuperAdmin) {
    // Get first organization for context, but allow access to all
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .limit(1);

    const orgId = memberships && memberships.length > 0 ? memberships[0].organization_id : null;

    return {
      role: "root", // Super admin has root privileges
      orgId,
      hasAccess: true,
      isSuperAdmin: true
    };
  }

  // Regular user flow
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return { role: null, orgId: null, hasAccess: false, isSuperAdmin: false };
  }

  // Căutăm prima organizație unde user-ul are role permis
  const allowedMembership = memberships.find((m) =>
    ALLOWED_ROLES.includes(m.role as UserRole)
  );

  if (!allowedMembership) {
    // Are memberships dar niciun role permis
    return {
      role: memberships[0].role as UserRole,
      orgId: memberships[0].organization_id,
      hasAccess: false,
      isSuperAdmin: false
    };
  }

  return {
    role: allowedMembership.role as UserRole,
    orgId: allowedMembership.organization_id,
    hasAccess: true,
    isSuperAdmin: false
  };
}

export function isAllowedRole(role: UserRole | null): boolean {
  return role ? ALLOWED_ROLES.includes(role) : false;
}
