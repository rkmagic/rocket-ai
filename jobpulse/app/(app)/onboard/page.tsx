import { OnboardingWizard } from "@/components/onboarding-wizard";

export const dynamic = "force-dynamic";

export default function OnboardPage() {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <OnboardingWizard />
    </div>
  );
}

