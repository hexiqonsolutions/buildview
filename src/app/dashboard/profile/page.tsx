import { redirect } from "next/navigation";
import { getProfileForPage } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { User } from "lucide-react";
import type { Client } from "@/lib/types";

export default async function ProfilePage() {
  const user = await getProfileForPage();

  if (!user) {
    redirect("/login?error=profile_setup_failed&redirect=/dashboard/profile");
  }

  let client: Client | null = null;
  if (user.client_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", user.client_id)
      .is("deleted_at", null)
      .single();
    client = data;
  }

  return (
    <IntelPage
      title="Profile"
      description="Account settings and preferences."
      icon={User}
      eyebrow="Account"
    >
      <ProfileForm user={user} client={client} />
    </IntelPage>
  );
}
