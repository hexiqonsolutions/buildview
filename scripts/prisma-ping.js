const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ path: ".env" });
const p = new PrismaClient();
p.$connect()
  .then(() => p.user.findMany({ take: 1 }))
  .then((r) => {
    console.log("OK rows", r.length);
    return p.$disconnect();
  })
  .catch(async (e) => {
    console.log("FAIL", e.name);
    console.log(String(e.message).split("\n").slice(0, 4).join(" | "));
    try { await p.$disconnect(); } catch {}
    process.exit(1);
  });
