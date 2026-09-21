/* WHERE A FINISHED FILE CAN GO, AND THE THREE HONEST ANSWERS.

   The branch that matters most here is "unreachable", because it is the
   one nobody exercises by accident: it needs a storage that is connected
   AND broken at the same time. That is exactly the situation where a
   silent failure sends somebody away believing their document is filed.

   So it is tested here rather than waited for. */

import { storageTarget, storageMessage, storageTools, STORAGE } from "../../src/shared/storage.js";

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed += 1; console.log("  ok   " + name); }
  else { failed += 1; console.log("  FAIL " + name); }
}

/* The real deployment today: the product knows about Google Drive, but it
   is not connectable yet, so nothing can be filed anywhere. */
const TODAY = [
  { id: "canva", label: "Canva", state: "connectable" },
  { id: "drive", label: "Google Drive", state: "registered", kind: "storage" },
  { id: "email", label: "Gmail", state: "sample" },
];

const none = await storageTarget(TODAY, {});
check("nothing connected reports none", none.state === STORAGE.NONE);
check("and says so as a fact, not an error",
  storageMessage(none).includes("No storage is connected here"));
check("and still points at the download", storageMessage(none).includes("download"));

check("a storage tool that is only coming soon is still none",
  (await storageTarget(TODAY, { drive: true })).state === STORAGE.NONE);

check("a design tool being connected is not storage",
  (await storageTarget(TODAY, { canva: true })).state === STORAGE.NONE);

check("no tools at all is none", (await storageTarget([], {})).state === STORAGE.NONE);

/* A deployment on Dropbox. Same function, a different tool list, which is
   exactly how a real connector will arrive. */
const DROPBOX = [{ id: "box", label: "Dropbox", state: "connectable", kind: "storage" }];

const notSignedIn = await storageTarget(DROPBOX, {});
check("connected in the product but not signed in is none", notSignedIn.state === STORAGE.NONE);

const ready = await storageTarget(DROPBOX, { box: true }, async () => true);
check("signed in and reachable is ready", ready.state === STORAGE.READY);
check("and it says where it went", storageMessage(ready) === "Filed in Dropbox.");

const broken = await storageTarget(DROPBOX, { box: true }, async () => false);
check("signed in but unreachable is unreachable", broken.state === STORAGE.UNREACHABLE);
check("and it NAMES the place it could not reach", storageMessage(broken).includes("Dropbox"));
check("and says plainly that nothing was filed",
  storageMessage(broken).includes("nothing has been filed"));

const threw = await storageTarget(DROPBOX, { box: true }, async () => { throw new Error("401"); });
check("a reach that throws is unreachable, never a crash", threw.state === STORAGE.UNREACHABLE);

/* With no way to test reachability, assume it works rather than block. */
const untested = await storageTarget(DROPBOX, { box: true });
check("no reach test given means ready rather than a guess at broken",
  untested.state === STORAGE.READY);

check("a missing result still gets a sentence, never a blank",
  storageMessage(null).length > 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
