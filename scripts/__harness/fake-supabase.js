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

function builder(table) {
  const api = {
    select: () => api,
    eq: () => api,
    order: () => api,
    limit: () => Promise.resolve({ data: ROWS[table] ?? [], error: null }),
  };
  return api;
}

export const supabase = {
  from: (table) => builder(table),
  auth: { getSession: async () => ({ data: { session: null } }) },
};
