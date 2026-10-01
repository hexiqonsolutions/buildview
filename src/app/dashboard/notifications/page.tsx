import { redirect } from "next/navigation";

/** Notifications live in the header bell dropdown; keep old links working. */
export default function ClientNotificationsPage() {
  redirect("/dashboard");
}
