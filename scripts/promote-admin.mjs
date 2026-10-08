import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "./lib/env.mjs";

loadEnvFile();
const email = (process.argv[2] || "vaibhavpgurav@gmail.com").trim().toLowerCase();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

const authUser = listed.users.find((u) => u.email?.toLowerCase() === email);
if (!authUser) {
  console.error(`No auth user for ${email}. Sign up first, then re-run.`);
  process.exit(1);
}

await admin.auth.admin.updateUserById(authUser.id, {
  user_metadata: { ...authUser.user_metadata, role: "super_admin" },
});

const { data: existing } = await admin.from("users").select("id").eq("id", authUser.id).maybeSingle();
if (existing) {
  await admin.from("users").update({ role: "super_admin", client_id: null, is_active: true }).eq("id", authUser.id);
} else {
  await admin.from("users").insert({
    id: authUser.id,
    email: authUser.email,
    full_name: authUser.user_metadata?.full_name || email.split("@")[0],
    role: "super_admin",
    client_id: null,
    is_active: true,
  });
}

console.log(`Done: ${email} is super_admin`);
