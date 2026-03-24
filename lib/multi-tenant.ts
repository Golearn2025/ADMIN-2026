import { createClient } from "@/lib/supabase/server";

export interface MultiTenantFilter {
  isSuperAdmin: boolean;
  selectedOrgId?: string | null;
  userOrgId?: string | null;
}

export interface OrganizationFilter {
  column: string;
  operator: 'eq' | 'in' | 'is' | null;
  value: any;
}

/**
 * Get organization filter for multi-tenant queries
 * 
 * CASE 1: SUPER ADMIN + ALL selected → null (no filter)
 * CASE 2: SUPER ADMIN + specific org → filter by selected org
 * CASE 3: NORMAL USER → always filter by user's org
 */
export function getOrganizationFilter(filter: MultiTenantFilter): OrganizationFilter | null {
  const { isSuperAdmin, selectedOrgId, userOrgId } = filter;

  // CASE 1: Super Admin wants to see ALL organizations
  if (isSuperAdmin && (!selectedOrgId || selectedOrgId === 'all')) {
    return null; // No filter - see everything
  }

  // CASE 2: Super Admin selected specific organization
  if (isSuperAdmin && selectedOrgId) {
    return {
      column: 'organization_id',
      operator: 'eq',
      value: selectedOrgId
    };
  }

  // CASE 3: Normal user - always filter by their organization
  if (userOrgId) {
    return {
      column: 'organization_id',
      operator: 'eq',
      value: userOrgId
    };
  }

  // Fallback - no organization context
  return null;
}

/**
 * Apply organization filter to Supabase query
 */
export function applyOrganizationFilter(
  query: any,
  filter: MultiTenantFilter
): any {
  const orgFilter = getOrganizationFilter(filter);

  if (!orgFilter) {
    return query; // No filter needed
  }

  switch (orgFilter.operator) {
    case 'eq':
      return query.eq(orgFilter.column, orgFilter.value);
    case 'in':
      return query.in(orgFilter.column, orgFilter.value);
    case 'is':
      return query.is(orgFilter.column, orgFilter.value);
    default:
      return query;
  }
}

/**
 * Get current organization context from request
 */
export async function getOrganizationContext(request?: Request): Promise<MultiTenantFilter> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      isSuperAdmin: false,
      selectedOrgId: null,
      userOrgId: null
    };
  }

  // Check if user is super admin
  const { data: isSuperAdmin } = await supabase
    .rpc('get_user_super_admin_status', { user_id: user.id });

  // Get user's organization
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1);

  const userOrgId = memberships && memberships.length > 0 ? memberships[0].organization_id : null;

  // Get selected organization from header/localStorage
  const selectedOrgId = request?.headers?.get('x-organization-id') || 
                        (typeof localStorage !== 'undefined' ? localStorage.getItem('currentOrganizationId') : null);

  return {
    isSuperAdmin: !!isSuperAdmin,
    selectedOrgId,
    userOrgId
  };
}
