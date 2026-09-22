# Functions that live in the Amara project, not this one

**Nothing in this folder is deployed by StellaXafe.** It is kept here so the
code is not lost and so anybody reading the support path can see both halves
of it in one place.

## Why there are two projects at all

The WhatsApp number, the Meta approval and the access token all belong to
**Amara**, a separate Supabase project (`xdvvidenbpsyzxgkofjj`). StellaXafe
has no WhatsApp connection of its own and should not get one: duplicating a
Meta integration in a second project means two tokens, two approvals and two
things to keep in step.

So the path a customer's question takes is:

```
customer -> WhatsApp -> Meta -> Amara receive-whatsapp-webhook
         -> StellaXafe support-ask   (answers from the company's material)
         -> back the same way
```

And when support escalates to a person, the answer goes:

```
staff -> StellaXafe support screen -> StellaXafe support-reply
      -> Amara support-whatsapp-send -> Meta -> WhatsApp
```

## The number

**+234 906 628 4656.** That is Amara's WhatsApp Business number, the one a
customer messages and the one every reply goes out from.

It is not written into any code and it must not be. The functions send
through `WHATSAPP_PHONE_NUMBER_ID`, a secret already set in Amara, and that
id is what Meta actually routes on. The number above is the human readable
form of the same thing, kept here so nobody has to go hunting through Meta's
dashboard to find out which number to test against.

## `support-whatsapp-send.ts`

Deploy this **to the Amara project**, with **Verify JWT OFF**.

It is not `admin-send-whatsapp`, which already exists in Amara and is right
as it is. That one is Amara's own inbox: it demands an Amara admin JWT
because a person is pressing the button, and it checks the 24 hour window
against `admin_messages`, which knows nothing about a StellaXafe support
thread. Neither fits a server to server call about a conversation living in
another project.

**Three secrets in Amara:** `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`
are already there for the other functions. `SUPPORT_BRIDGE_SECRET` is new.

**Two secrets in StellaXafe:** `SUPPORT_BRIDGE_SECRET`, the same value, and
`AMARA_FUNCTIONS_URL`.

Without those, `support-reply` falls back to email exactly as it did before,
which is the right behaviour for a company that never wired WhatsApp up.
