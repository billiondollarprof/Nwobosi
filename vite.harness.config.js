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
      {
        /* ANCHORED AT BOTH ENDS ON PURPOSE. With a regular expression only
           the matched part of the specifier is swapped, so an unanchored
           pattern left the "../" in front and produced "..//home/user/...".
           Matching the whole specifier replaces the whole thing. */
        find: /^.*\/shared\/supabase\.js$/,
        replacement: path.resolve(process.cwd(), "scripts/__harness/fake-supabase.js"),
      },
    ],
  },
  server: { host: true, port: 5301, strictPort: true },
});
