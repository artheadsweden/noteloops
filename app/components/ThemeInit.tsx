"use client";

import { useEffect } from "react";

import { getBrowserSupabaseClient, isSupabaseConfigured } from "@/services/supabase/browser";
import { getSupabaseUserSettings } from "@/services/settings";
import type { Theme } from "@/services/settings";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function ThemeInit() {
  useEffect(() => {
    // Apply local theme immediately to avoid "always light" until visiting /account.
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") applyTheme(stored);
    } catch {
      // ignore
    }

    if (!isSupabaseConfigured()) return;

    const supabase = getBrowserSupabaseClient();
    let cancelled = false;

    const refresh = async () => {
      const settings = await getSupabaseUserSettings();
      if (cancelled || !settings?.theme) return;

      applyTheme(settings.theme);
      try {
        localStorage.setItem("theme", settings.theme);
      } catch {
        // ignore
      }
    };

    void refresh();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
