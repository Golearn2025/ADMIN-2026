import { createClient } from "@/lib/supabase/server";

/**
 * Get current organization for user from database
 * This replaces localStorage-based organization context
 */
export async function getCurrentOrg(supabase: any, userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("user_context")
      .select("current_org_id")
      .eq("auth_user_id", userId)
      .single();

    if (error) {
      console.error("Error getting current org:", error);
      return null;
    }

    return data?.current_org_id || null;
  } catch (error) {
    console.error("Error in getCurrentOrg:", error);
    return null;
  }
}

/**
 * Set current organization for user in database
 * This replaces localStorage-based organization setting
 */
export async function setCurrentOrg(supabase: any, userId: string, orgId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_context")
      .upsert({
        auth_user_id: userId,
        current_org_id: orgId,
      });

    if (error) {
      console.error("Error setting current org:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in setCurrentOrg:", error);
    return false;
  }
}

/**
 * Auto-detect and set organization for user
 * Used during login to set default organization
 */
export async function autoSetOrganization(supabase: any, userId: string): Promise<string | null> {
  try {
    // Get user's organizations
    const { data: memberships, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        organizations!inner (
          id,
          name
        )
      `)
      .eq('user_id', userId);

    if (membersError) {
      console.error("Error fetching memberships:", membersError);
      return null;
    }

    const organizations = memberships || [];
    
    // Check if user is super admin
    const { data: isSuperAdmin } = await supabase
      .rpc('get_user_super_admin_status', { user_id: userId });

    let selectedOrgId: string | null = null;

    console.log('🔍 AUTO-SET ORG DEBUG:');
    console.log('   userId:', userId);
    console.log('   organizations:', organizations);
    console.log('   isSuperAdmin:', isSuperAdmin);

    if (organizations.length === 1) {
      // User has exactly one organization - auto-select it
      selectedOrgId = organizations[0].organization_id;
      console.log('   One org - selected:', selectedOrgId);
    } else if (isSuperAdmin) {
      // Super admin with multiple organizations - use "ALL" (null means all)
      selectedOrgId = null; // null = ALL for super admin
      console.log('   Super admin - ALL (null)');
    } else if (organizations.length > 1) {
      // Regular user with multiple organizations - select first one
      selectedOrgId = organizations[0].organization_id;
      console.log('   Multiple orgs - selected first:', selectedOrgId);
    }

    // Set the selected organization
    if (selectedOrgId) {
      await setCurrentOrg(supabase, userId, selectedOrgId);
    }

    return selectedOrgId;
  } catch (error) {
    console.error("Error in autoSetOrganization:", error);
    return null;
  }
}
