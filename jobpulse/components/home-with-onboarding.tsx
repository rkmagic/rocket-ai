"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@prisma/client";
import { DashboardClient } from "@/components/dashboard-client";

const ONBOARD_ACTIVE_KEY = "jobpulse_onboard_active";

export function HomeWithOnboarding() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<UserProfile | null | undefined>(undefined);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const p = (await res.json()) as UserProfile | null;
        if (!mounted) return;
        setProfile(res.ok ? p : null);
      } catch {
        if (!mounted) return;
        setProfile(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (profile === undefined) return;

    const onboardingActive =
      typeof window !== "undefined" && localStorage.getItem(ONBOARD_ACTIVE_KEY) === "1";

    if (!profile || onboardingActive) {
      router.replace("/onboard");
    }
  }, [profile, router]);

  // Avoid flicker: only show dashboard once we know profile exists AND onboarding isn't active.
  if (profile === undefined) return <div className="min-h-screen" />;

  const onboardingActive = typeof window !== "undefined" && localStorage.getItem(ONBOARD_ACTIVE_KEY) === "1";
  if (!profile || onboardingActive) return <div className="min-h-screen" />;

  return <DashboardClient />;
}

