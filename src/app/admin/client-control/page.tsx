import { redirect } from "next/navigation";

/** Legacy route — merged into Client Manager. */
export default function AdminClientControlPage() {
  redirect("/admin/clients");
}
