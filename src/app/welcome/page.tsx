import { redirect } from "next/navigation";
import { WelcomeGate } from "@/components/portal/welcome-gate";
import { hasAssignedPortalAccess } from "@/lib/auth/portal-access";
import { getCurrentUser } from "@/lib/actions/auth";

export default async function WelcomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/welcome");
  }

  if (!user.is_active || user.deleted_at) {
    redirect("/login?error=account_inactive");
  }

  const hasAccess = await hasAssignedPortalAccess({
    id: user.id,
    role: user.role,
    client_id: user.client_id,
  });

  if (hasAccess) {
    redirect("/dashboard");
  }

  const email = user.email?.trim() || "user@buildview.local";
  const fullName = user.full_name?.trim() || email.split("@")[0] || "there";

  return <WelcomeGate userName={fullName} userEmail={email} />;
}
