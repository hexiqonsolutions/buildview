import { execSync } from "node:child_process";
import net from "node:net";

const PORT = Number(process.env.PORT || 3000);

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

if (await isPortInUse(PORT)) {
  console.error(
    `\nPort ${PORT} is already in use. Another Next.js dev server is probably running.\n` +
      `Stop all "npm run dev" terminals, then run:\n\n` +
      `  npm run dev:fresh\n`
  );
  process.exit(1);
}

execSync(`next dev -p ${PORT}`, { stdio: "inherit" });
