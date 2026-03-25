import { getActiveProfile } from "@/lib/profile";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getActiveProfile();

  return (
    <div className="min-h-screen bg-[#fafaf9] p-6 md:p-10">
      {!profile && (
        <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm text-teal-900">
          Welcome—start here. Save your profile once, then head to <strong>Companies</strong> and run a scan to pull in
          open roles.
        </div>
      )}
      <ProfileForm initial={profile} />
    </div>
  );
}
