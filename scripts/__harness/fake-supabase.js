/* A stand in for src/shared/supabase.js, used only by the harness below.
   It answers the two tables the Support page reads, with fixed rows, so the
   screen can be looked at without a signed in workspace. Nothing imports it
   except scripts/__harness/*, and vite.harness.config.js aliases it in. */

const ROWS = {
  support_threads: [
    {
      id: "t1",
      channel: "web",
      customer_ref: "amara@greenwich.example",
      customer_name: "Amara Okeke",
      customer_email: "amara@greenwich.example",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      last_message_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: "t2",
      channel: "whatsapp",
      customer_ref: "+2348030000000",
      customer_name: "Tunde Bello",
      customer_email: null,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      last_message_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  escalations: [
    {
      id: "e1",
      thread_id: "t1",
      question:
        "I was charged twice for the September invoice and the second one has a different reference. Can somebody check which of the two actually went through, and refund the other?",
      raised_at: new Date(Date.now() - 1800000).toISOString(),
      closed_at: null,
    },
  ],
  knowledge_sources: [
    {
      id: "k1",
      name: "Brand voice guide",
      description: "How we sound",
      kind: "file",
      status: "ready",
      location: null,
      customer_visible: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  knowledge_chunks: [],
  support_messages: Array.from({ length: 9 }).map((_, i) => ({
    id: `m${i}`,
    thread_id: "t1",
    author_role: i % 2 === 0 ? "customer" : "assistant",
    body:
      i % 2 === 0
        ? "Hello, I have a question about my account and the billing on it this month."
        : "Happy to help. Here is what I can see on the account from the material I have.",
    created_at: new Date(Date.now() - (9 - i) * 600000).toISOString(),
  })),
};

/* DELETES ARE REAL IN HERE, and they have to be, because the bug being
   tested is a delete that looked like it worked and did not. A stub that
   always says yes would pass the broken code as happily as the fixed one.

   window.__BLOCK_DELETE = true makes a delete match nothing and report no
   error, which is exactly what a row level security policy does. */
/* window.__NO_WORK_CONTENT = true answers the work_content table the way
   PostgREST does before the table exists, so the walk can prove the app
   falls back to the old way and loses nothing. */
function missing(table) {
  return table === "work_content" && window.__NO_WORK_CONTENT
    ? { data: null, error: { code: "PGRST205", message: "Could not find the table 'public.work_content' in the schema cache" } }
    : null;
}

function builder(table) {
  const filters = [];
  const matching = () => (ROWS[table] ?? []).filter((r) => filters.every(([c, v]) => (Array.isArray(v) ? v.includes(r[c]) : r[c] === v)));
  const api = {
    select: () => api,
    eq: (col, val) => { filters.push([col, val]); return api; },
    /* Only a query ending in .in() can be awaited directly. Giving the
       whole builder a then() would change what every other walk sees. */
    in: (col, vals) => {
      filters.push([col, vals]);
      return { then: (resolve) => Promise.resolve(missing(table) ?? { data: matching(), error: null }).then(resolve) };
    },
    order: () => api,
    limit: () => Promise.resolve({ data: ROWS[table] ?? [], error: null }),
    insert: (row) => {
      const put = () => {
        const gone = missing(table);
        if (gone) return gone;
        const made = { id: `new-${Date.now()}`, created_at: new Date().toISOString(), ...row };
        (ROWS[table] = ROWS[table] ?? []).unshift(made);
        return { data: made, error: null };
      };
      return {
        select: () => ({ single: () => Promise.resolve(put()) }),
        then: (resolve) => Promise.resolve(put()).then(resolve),
      };
    },
    update: (change) => {
      const upd = {
        eq: (col, val) => { filters.push([col, val]); return upd; },
        select: () => upd,
        single: () => {
          const hit = matching();
          hit.forEach((r) => Object.assign(r, change));
          return Promise.resolve(hit.length ? { data: hit[0], error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } });
        },
      };
      return upd;
    },
    delete: () => {
      const run = () => {
        if (window.__BLOCK_DELETE) return { data: [], error: null };
        const before = ROWS[table] ?? [];
        const hit = before.filter((r) => filters.every(([c, v]) => r[c] === v));
        ROWS[table] = before.filter((r) => !hit.includes(r));
        return { data: hit.map((r) => ({ id: r.id })), error: null };
      };
      const del = {
        eq: (col, val) => { filters.push([col, val]); return del; },
        select: () => Promise.resolve(run()),
        then: (resolve) => Promise.resolve(run()).then(resolve),
      };
      return del;
    },
  };
  return api;
}

/* The list the admin screen reads. Kept here so a test can see what the
   database actually holds after a delete, rather than what the screen
   decided to draw. */
export function __rows(table) {
  return ROWS[table] ?? [];
}

/* Everything the pages actually reach for. Anything missing here shows up
   as a page error in the flow test rather than as a silent wrong answer,
   which is how these came to be listed: the chat asks whether Canva is
   connected on mount, and it asks who is signed in. */
export const supabase = {
  from: (table) => builder(table),
  auth: {
    getSession: async () => ({ data: { session: { access_token: "fake", user: { id: "s1" } } } }),
    getUser: async () => ({ data: { user: { id: "s1", email: "anthony@example.com" } }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  functions: {
    invoke: async () => ({ data: { connected: false }, error: null }),
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
};
