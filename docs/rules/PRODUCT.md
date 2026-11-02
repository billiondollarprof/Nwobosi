# Product rules: what the product must always feel like

Open this before designing or changing any screen, any flow, or any admin
setup step. Moved here unchanged from `CLAUDE.md` on 2026-11-02. The deeper
"why" is in `docs/product/DIRECTION.md`.

## The product principle

The product should feel like an unfair advantage to someone who is not technical. Simple to set up, simple to use, working at full intelligence underneath. It should feel like cheating.

That means:

- **The staff side has no settings.** No model picker, no advanced options, no toggles. Every knob you show is a way to get it wrong, and a reminder they are operating machinery. They talk, it works.
- **Admin setup never exposes the plumbing.** An admin should never need to understand embeddings, chunking, vectors, or retrieval. Setup is: upload your files, give each one a name and a line saying what it holds, invite your people. Everything technical happens out of sight.
- **Plain words in every screen.** No indexed, embedding, vector, token, RAG, or model ID in anything a user reads. Say ready, being read, outside sources. This is the rule for a deployed company's own app, the screens their staff and admin actually use every day. It does not loosen there, ever.
- **Two things stay visible, because they build trust.** The read back, which proves it understood before spending someone's time. And which sources it used, which proves it is not inventing. Everything else hides.

The advantage does not come from the model. It comes from the output already knowing the company's templates, numbers, and standards without the staff member supplying any of it. Build toward that.

**The landing page, and anything else that is StellaXafe talking about itself, is a different surface with different rules.** A calm, mature, premium company is allowed to sound like it knows what it is talking about. Use a real technical term where it earns its place and carries authority, RLS, retrieval, tenant isolation, that kind of thing, rather than always reaching for the softest possible word. The read is not a technical buyer, but someone technical usually reviews the page before a deal moves, so it should hold up to that read too. What it is not: a wall of buzzwords, or jargon reached for out of habit rather than because the sentence needed it. Calm and simple stays the default tone, a real term shows up when it is the clearest and most precise word available, not as flavour.

## No passwords

Anthony's rule, and it holds unless a customer's own security policy
demands otherwise: **this product does not use passwords.**

- Signing in is a code sent to the person's email.
- An invitation is a link that works once and runs out.
- The demo's access code is the identity for the demo.
- A client who asks for passwords, because their policy says so, gets
  them. Nobody else does.

The reason is not fashion. A password is a secret the person has to store,
they store it badly or forget it, so every password system grows a reset
flow, and the reset flow is email anyway. The inbox was always the real
boundary. Going straight there removes a class of support work and the
worst failure this product can have, which is somebody locked out of a
workspace with no way back.

Where a password still exists in the code, it is either an account made
before this rule or a random value the server generates and throws away.
Neither is ever shown to anybody.
