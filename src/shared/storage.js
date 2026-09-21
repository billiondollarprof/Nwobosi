/* ==========================================================================
   WHERE A FINISHED FILE CAN GO

   WHY THIS IS NOT CALLED "DRIVE"
   Anthony, 2026-09-21: "it doesn't just search for drive, like it searches
   for any storage or any storage platform connected. It can be a drive, it
   can be Dropbox. It can be any cloud storage that's connected."

   So nothing in the product says Google Drive. It says "your storage", and
   which storage that is was decided when the company was set up. A firm on
   Dropbox sees Dropbox. A firm on SharePoint sees SharePoint. The chat
   never names a brand it cannot reach.

   THE THREE ANSWERS, AND ALL THREE ARE SAID OUT LOUD
   His comparison: "just like you used to know that Supabase is not within
   your reach, you are able to know."

     none         Nothing is connected in this deployment. A fact about how
                  it was set up, not an error and not a failure.
     unreachable  Something IS connected and it could not be reached. A
                  permission has gone, or something broke.
     ready        It is there and it works.

   A SILENT FAILURE IS THE WORST OF THE THREE, and that is the whole reason
   this file exists rather than a try/catch at the call site. Somebody who
   presses "put this in our storage" and sees nothing happen walks away
   believing their document is filed. It is not, and they find out when
   somebody asks them for it.

   WHEN A REAL CONNECTOR ARRIVES, ONLY THIS FILE CHANGES. The card, the
   messages and the tests all speak through `storageTarget`, so wiring up
   Dropbox or SharePoint is teaching this one function about it.

   IT IMPORTS NOTHING, ON PURPOSE. The tool list is handed in rather than
   read from config, for two reasons. config pulls in icon components, so
   a test could not load this file at all without a bundler. And a test
   that has to rebuild the logic against its own list is testing a copy,
   which proves nothing about what ships. Handed in, every branch below is
   exercised by the real function.
   ========================================================================== */

export const STORAGE = {
  NONE: "none",
  UNREACHABLE: "unreachable",
  READY: "ready",
};

/* Which of the connectors are somewhere a file can be PUT, as opposed to
   somewhere facts are read from. A design tool is not storage. An inbox is
   not storage. */
export function storageTools(tools = []) {
  return tools.filter((tool) => tool.kind === "storage");
}

/* WHAT THIS DEPLOYMENT CAN ACTUALLY DO WITH A FINISHED FILE.

   `connectors` is the map the chat already holds, of what this person has
   signed in to. `reach` is how the caller tests that a connected thing can
   really be reached; it is a parameter rather than a call so this stays
   testable and so the test can be the one that proves the unreachable
   branch, which is the branch nobody ever exercises by accident. */
export async function storageTarget(tools = [], connectors = {}, reach = null) {
  const found = storageTools(tools);
  if (!found.length) return { state: STORAGE.NONE, name: "" };

  /* Connected means this person linked it, not merely that the product
     knows the tool exists. A tool sitting at "coming soon" is not storage
     anybody can file anything in. */
  const linked = found.filter((tool) => tool.state === "connectable" && connectors[tool.id] === true);
  if (!linked.length) return { state: STORAGE.NONE, name: "" };

  const tool = linked[0];
  if (!reach) return { state: STORAGE.READY, name: tool.label };

  try {
    const ok = await reach(tool);
    return ok
      ? { state: STORAGE.READY, name: tool.label }
      : { state: STORAGE.UNREACHABLE, name: tool.label };
  } catch {
    return { state: STORAGE.UNREACHABLE, name: tool.label };
  }
}

/* WHAT A PERSON IS TOLD, and it is never a shrug.

   Plain words, no jargon, and it says what is true rather than what is
   convenient. The deployment sentence in particular is worth getting
   right: "no storage is connected here" is a fact about how this was set
   up, and it should not read like the product has broken. */
export function storageMessage(result) {
  if (!result) return "Could not file that. Try again.";

  if (result.state === STORAGE.NONE) {
    return "No storage is connected here, so there is nowhere to file it. You can still download it.";
  }
  if (result.state === STORAGE.UNREACHABLE) {
    const where = result.name || "your storage";
    return `Could not reach ${where}. The connection may have expired, so nothing has been filed. You can still download it.`;
  }
  return `Filed in ${result.name || "your storage"}.`;
}
