/* Serves scripts/__harness only. Aliases the Supabase client to a fake so a
   screen that reads the database can be looked at without a workspace.
   Never used by `npm run build`. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: "scripts/__harness",
  plugins: [react()],
  resolve: {
    /* Matched on the raw specifier, because every page writes it as a
       relative path ("../shared/supabase.js") and an absolute key never
       fires. */
    alias: [
      /* ANCHORED AT BOTH ENDS ON PURPOSE. With a regular expression only
         the matched part of the specifier is swapped, so an unanchored
         pattern left the "../" in front and produced "..//home/user/...".
         Matching the whole specifier replaces the whole thing. */
      {
        /* No "/shared/" in the pattern, deliberately. session.js reaches
           for its neighbour as "./supabase.js", so a pattern insisting on
           the folder name missed it, the real client loaded, and the page
           died on "supabaseUrl is required". This catches both spellings
           and still cannot match the "@supabase/supabase-js" package. */
        find: /^.*supabase\.js$/,
        replacement: path.resolve(process.cwd(), "scripts/__harness/fake-supabase.js"),
      },
      /* ANCHORED TO THE EXACT SPECIFIER THE PAGES USE, and it has to be.
         The loose pattern also caught the harness's own
         "../../src/shared/session.js", so the harness handed the tests the
         FAKE module and window.__session had no removeSource on it. The
         pages all write "../shared/session.js" from src/pages, and nothing
         else does, so matching that exactly swaps the pages and leaves the
         harness with the real thing. */
      {
        find: /^\.\.\/shared\/session\.js$/,
        replacement: path.resolve(process.cwd(), "scripts/__harness/fake-session.js"),
      },
      /* The fake re-exports toApiMessages from the real module, so this one
         must not rewrite its own import. It uses an absolute src/ path for
         exactly that reason. */
      {
        find: /^\.\.\/shared\/assistantApi\.js$/,
        replacement: path.resolve(process.cwd(), "scripts/__harness/fake-assistantApi.js"),
      },
    ],
  },
  server: { host: true, port: 5301, strictPort: true },
});
