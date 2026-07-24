import { redirect } from "next/navigation";
import { getProfileForPage } from "@/lib/actions/profile";
import { getPlatformSettings } from "@/lib/actions/platform-settings";
import { SupportPanel } from "@/components/dashboard/support-panel";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { LifeBuoy } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export default async function SupportPage() {
  const user = await getProfileForPage();

  if (!user) {
    redirect("/login?error=profile_setup_failed&redirect=/dashboard/support");
  }

  const platform = await getPlatformSettings();

  return (
    <IntelPage
      title="Support"
      description="Get help with your BuildView portal."
      icon={LifeBuoy}
      eyebrow="Help"
    >
      <SupportPanel
        supportEmail={platform.supportEmail || siteConfig.contact.email}
        supportPhone={siteConfig.contact.phone}
        userEmail={user.email}
        userName={user.full_name}
      />
    </IntelPage>
  );
}
