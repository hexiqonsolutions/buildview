import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();
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
