const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ path: ".env" });
const p = new PrismaClient();
(async () => {
  const rows = await p.emailMessage.findMany({
    where: { status: "SENT", deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      subject: true,
      trackingToken: true,
      openCount: true,
      sentAt: true,
      toAddresses: true,
    },
  });
  for (const r of rows) {
    console.log(
      JSON.stringify({
        subject: r.subject,
        to: r.toAddresses,
        hasToken: Boolean(r.trackingToken),
        tokenLen: r.trackingToken ? r.trackingToken.length : 0,
        openCount: r.openCount,
        sentAt: r.sentAt,
      })
    );
  }
  await p.$disconnect();
})().catch(async (e) => {
  console.error("FAIL", e.message);
  try { await p.$disconnect(); } catch {}
  process.exit(1);
});
