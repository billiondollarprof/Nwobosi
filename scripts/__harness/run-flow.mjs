/* Starts the harness, runs the flow walk against it, stops it again, and
   exits non zero if any check failed. This is what `npm run flow` and
   `npm run check` call, so the flow cannot break silently again.

   It owns the server's whole life on purpose. A test that expects somebody
   to have started a server by hand is a test that gets skipped. */

import { spawn } from "node:child_process";
import net from "node:net";

const PORT = 5301;
const URL_ROOT = `http://localhost:${PORT}/`;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function portOpen() {
  return new Promise((resolve) => {
    const socket = net.connect({ port: PORT, host: "127.0.0.1" }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(400, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/* Somebody may already be running the harness to look at a page. Use it
   rather than fighting it for the port. */
const alreadyUp = await portOpen();

let server = null;
if (!alreadyUp) {
  server = spawn("npx", ["vite", "--config", "vite.harness.config.js"], {
    stdio: "ignore",
    detached: false,
  });

  let up = false;
  for (let i = 0; i < 40; i += 1) {
    await wait(500);
    if (await portOpen()) { up = true; break; }
  }
  if (!up) {
    server.kill();
    console.error(`the harness did not come up on ${URL_ROOT} within 20 seconds`);
    process.exit(1);
  }
}

const run = spawn("node", ["scripts/__harness/flow.cjs"], { stdio: "inherit" });

const code = await new Promise((resolve) => run.on("close", resolve));
if (server) server.kill();
process.exit(code ?? 1);
