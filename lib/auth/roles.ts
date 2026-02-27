import { createClient } from "@/lib/supabase/server";

export type UserRole = "root" | "owner" | "admin" | "member" | "guest";

const ALLOWED_ROLES: UserRole[] = ["root", "owner", "admin"];

export interface UserRoleInfo {
  role: UserRole | null;
  orgId: string | null;
  hasAccess: boolean;
}

export async function getUserRole(): Promise<UserRoleInfo> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { role: null, orgId: null, hasAccess: false };
  }

  // Citim direct din organization_members (prima cu role permis)
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return { role: null, orgId: null, hasAccess: false };
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
    };
  }

  return {
    role: allowedMembership.role as UserRole,
    orgId: allowedMembership.organization_id,
    hasAccess: true,
  };
}

export function isAllowedRole(role: UserRole | null): boolean {
  return role ? ALLOWED_ROLES.includes(role) : false;
}
