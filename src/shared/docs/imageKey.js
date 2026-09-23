/* How a picture's name is compared, shared by the writers and images.js.
   Its own tiny file so the writers can use it without pulling in the
   Supabase client that images.js needs, which keeps them testable in Node.

   Case and extension do not matter: "Team.JPG", "team.jpg" and "team" all
   find the same picture. */
export function imageKey(name) {
  return String(name ?? "").trim().toLowerCase().replace(/\.(png|jpe?g|webp|gif)$/i, "");
}
