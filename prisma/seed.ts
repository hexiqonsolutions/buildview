/**
 * Dev seed — run after migrate with:
 *   npx tsx prisma/seed.ts
 *
 * Requires SUPABASE users to already exist; this only seeds org scaffolding.
 * Prefer real auth signup for Module 1 verification.
 */

import { MembershipRole, MembershipStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "buildview-demo" },
    update: {},
    create: {
      name: "BuildView Demo",
      slug: "buildview-demo",
      branding: { primaryColor: "#F97316", theme: "dark" },
    },
  });

  console.log("Demo organization ready:", org.id);
  console.log(
    "Create a user via /signup — bootstrap attaches OWNER to a new org automatically."
  );
  console.log(
    "To attach an existing user to this demo org, insert a membership with role",
    MembershipRole.OWNER,
    MembershipStatus.ACTIVE
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
