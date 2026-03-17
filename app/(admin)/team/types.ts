export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export type UserRole = "root" | "owner" | "admin" | "operator" | "member" | "guest";
