export type UserProfile = {
  user_id: string;
  full_name: string | null;
  preferred_genres: string[] | null;
  wants_release_invites: boolean;
  access_mode: "all" | "restricted";
  blocked_at: string | null;
  updated_at: string;
};
