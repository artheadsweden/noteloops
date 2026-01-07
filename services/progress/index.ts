export type { UserProgress } from "@/services/progress/types";
export { getLocalProgress, setLocalProgress } from "@/services/progress/local";
export { getSupabaseProgress, upsertSupabaseProgress } from "@/services/progress/supabase";
export { saveProgress } from "@/services/progress/save";

// Future: add server-side (SSR) Supabase client for server components.
