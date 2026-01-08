"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSupabaseUserSettings, updateSupabaseUserSettings } from "@/services/settings";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Apply local theme immediately (fast), then prefer Supabase if present.
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
        applyTheme(stored);
      } else {
        const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
        const initial: Theme = prefersDark ? "dark" : "light";
        setTheme(initial);
        applyTheme(initial);
        localStorage.setItem("theme", initial);
      }
    } catch {
      // ignore
    }

    void (async () => {
      const settings = await getSupabaseUserSettings();
      if (!settings?.theme) return;
      setTheme(settings.theme);
      applyTheme(settings.theme);
      try {
        localStorage.setItem("theme", settings.theme);
      } catch {
        // ignore
      }
    })();
  }, []);

  const setAndPersist = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore
    }
    void updateSupabaseUserSettings({ theme: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={theme === "light" ? "secondary" : "outline"}
        size="sm"
        className={cn("gap-2", theme === "light" ? "" : "opacity-80")}
        onClick={() => setAndPersist("light")}
        aria-pressed={theme === "light"}
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
        Light
      </Button>
      <Button
        type="button"
        variant={theme === "dark" ? "secondary" : "outline"}
        size="sm"
        className={cn("gap-2", theme === "dark" ? "" : "opacity-80")}
        onClick={() => setAndPersist("dark")}
        aria-pressed={theme === "dark"}
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
        Dark
      </Button>
    </div>
  );
}
