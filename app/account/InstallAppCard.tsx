"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Info } from "lucide-react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua);
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari uses a non-standard navigator.standalone.
  const iosStandalone = Boolean((navigator as unknown as { standalone?: boolean }).standalone);
  return Boolean(standaloneMedia || iosStandalone);
}

export default function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const ios = useMemo(() => isIos(), []);

  useEffect(() => {
    setInstalled(isStandaloneDisplayMode());

    const onBeforeInstallPrompt = (e: Event) => {
      // Allows us to show a user-initiated button instead of relying on the browser banner.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setStatus("Installed.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canPromptInstall = Boolean(deferredPrompt) && !installed;

  const promptInstall = async () => {
    if (!deferredPrompt) return;

    setStatus(null);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setStatus("Installing…");
      } else {
        setStatus("Install dismissed. You can try again from this page or your browser menu.");
      }
    } catch {
      setStatus("Install prompt failed. Try using your browser menu.");
    } finally {
      // Chrome only lets you use the event once.
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="grid gap-3">
      {installed ? (
        <div className="text-sm text-muted-foreground">This app is already installed.</div>
      ) : canPromptInstall ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void promptInstall()} className="gap-2">
            <Download className="h-4 w-4" aria-hidden="true" />
            Install app
          </Button>
          <div className="text-sm text-muted-foreground">
            Works in Chrome/Edge when the browser allows install.
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {ios
            ? "On iPhone/iPad, use Safari’s Share menu to install."
            : "Install prompt isn’t available right now in this browser session."}
        </div>
      )}

      {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}

      <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="grid gap-2">
            <div className="font-medium text-foreground">How install works</div>
            <div>
              <span className="text-foreground">Android:</span> use Chrome or Edge → tap “Install app”
              (here or from the browser menu).
            </div>
            <div>
              <span className="text-foreground">iPhone/iPad:</span> open in Safari → Share → “Add to
              Home Screen”. (iOS doesn’t support the install prompt button.)
            </div>
            <div>
              If you dismissed the browser banner, it may not reappear automatically for a while —
              using the menu/button is the reliable path.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
