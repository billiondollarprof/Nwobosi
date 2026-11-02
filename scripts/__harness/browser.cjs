/* ==========================================================================
   BROWSER
   Where the flow walks and audits find Chromium.

   WHY IT EXISTS. Every walk used to launch Chromium from one fixed path,
   /opt/pw-browsers/chromium-1194/..., which existed in an earlier cloud
   session and nowhere else. On GitHub (CI) and in later sessions the path was
   missing, so every walk failed before a single check ran. Found 2026-11-02,
   the first time CI ran.

   WHAT IT DOES, in order:
     1. HARNESS_CHROME, if set, is used as the browser.
     2. The old fixed path, if it exists on this machine, is used.
     3. Otherwise Playwright uses its own installed browser (CI installs it
        with `npx playwright install --with-deps chromium`).

   WHAT IT MUST NEVER DO. Hide a real launch failure. It only chooses the
   path; if the chosen browser does not start, the walk still fails loudly.
   ========================================================================== */

const { existsSync } = require('node:fs');

const OLD_FIXED_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/* The options to pass to chromium.launch(). */
function launchOptions() {
  if (process.env.HARNESS_CHROME) return { executablePath: process.env.HARNESS_CHROME };
  if (existsSync(OLD_FIXED_PATH)) return { executablePath: OLD_FIXED_PATH };
  return {};
}

module.exports = { launchOptions };
