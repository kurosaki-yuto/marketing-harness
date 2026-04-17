export type License = {
  key: string;
  email: string;
  plan: string;
  status: "active" | "revoked" | "expired";
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
  note: string | null;
};
