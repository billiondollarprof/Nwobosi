// Amara — support-whatsapp-send (Supabase Edge Function)
//
// THE DOOR STELLAXAFE KNOCKS ON TO ANSWER A CUSTOMER ON WHATSAPP.
//
// Anthony, 2026-09-22: "only email when in escalation no direct back to
// Whatsapp."
//
// ── HOW THE TWO PROJECTS FIT TOGETHER ─────────────────────────────────────
// A customer messages Amara's WhatsApp number. Meta posts it to
// receive-whatsapp-webhook here in Amara. Amara passes the question over to
// StellaXafe's support-ask, which answers from the company's published
// material, and the answer comes back the same way. That half already works.
//
// What did not work is the other half. When support decides a question needs
// a person, a member of staff answers it on the StellaXafe support screen,
// and that reply could only go out by EMAIL. A customer who asked on WhatsApp
// got nothing on WhatsApp. This function is the missing return path.
//
// ── WHY NOT REUSE admin-send-whatsapp ─────────────────────────────────────
// That one is Amara's own inbox and it is right to be what it is. It demands
// an Amara ADMIN JWT, because a person is pressing the button. And it checks
// the 24 hour window against admin_messages, which holds Amara's own
// conversations and knows nothing about a StellaXafe support thread.
//
// Neither fits here. The caller is another server, not a person, and the
// conversation it is answering lives in a different project entirely. So this
// is its own function with its own way in.
//
// ⚠️ THE WAY IN IS A SHARED SECRET, NOT A USER.
// SUPPORT_BRIDGE_SECRET is held by this function and by StellaXafe's
// support-reply, and by nothing else. It is compared in constant time, so the
// comparison itself cannot be used to work the secret out one character at a
// time. There is no user to check, because there is no user: StellaXafe has
// already checked that a real member of staff, with support access, at the
// company that owns the thread, wrote this reply.
//
// ── THE 24 HOUR WINDOW IS META'S RULE AND IT IS NOT NEGOTIABLE ────────────
// A customer messaging first opens a 24 hour window. Inside it, a plain text
// reply needs no template and no approval, and it is free. Outside it, Meta
// refuses the send outright.
//
// This function does not check the window itself, and that is deliberate:
// the customer's last message lives in StellaXafe, not here, so any window
// this function worked out would be a guess. It sends, and if Meta refuses
// for that reason it says window_closed in plain words. StellaXafe then
// falls back to email and tells the staff member what happened, rather than
// showing a reply that never left the building.
//
// Required secrets (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY auto-injected):
//   WHATSAPP_TOKEN   WHATSAPP_PHONE_NUMBER_ID   SUPPORT_BRIDGE_SECRET
//
// Deploy with Verify JWT OFF. There is no user JWT to verify. The secret
// above is the check, and leaving the toggle on would refuse StellaXafe at
// the gateway before this file ever runs.

const WA_TOKEN    = Deno.env.get('WHATSAPP_TOKEN')           ?? ''
const WA_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''
const BRIDGE      = Deno.env.get('SUPPORT_BRIDGE_SECRET')    ?? ''

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-support-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })
}

/* THE SAME NORMALISATION EVERY OTHER AMARA FUNCTION USES, copied rather than
   imported because these two projects do not share code. A thread is keyed on
   this string. A different shape here would send to a number nobody is
   holding, and the send would succeed. */
function normalizePhone(raw: string): string {
  const d = String(raw ?? '').replace(/\D/g, '')
  if (d.startsWith('234')) return d
  if (d.startsWith('0'))   return '234' + d.slice(1)
  if (d.length >= 10)      return '234' + d
  return d
}

/* CONSTANT TIME, so the time this takes cannot be used to guess the secret.
   A plain === returns the moment two characters differ, which leaks how much
   of a guess was right. Lengths are compared first because they are not a
   secret, and because an equal length is what the loop below needs. */
function sameSecret(given: string, expected: string): boolean {
  if (!expected || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i += 1) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')    return json({ ok: false, reason: 'method' }, 405)

  if (!BRIDGE) {
    console.error('[support-whatsapp-send] SUPPORT_BRIDGE_SECRET is not set')
    return json({ ok: false, reason: 'bridge_not_configured' }, 500)
  }
  if (!WA_TOKEN || !WA_PHONE_ID) {
    return json({ ok: false, reason: 'whatsapp_not_configured' }, 500)
  }

  /* CHECKED BEFORE THE BODY IS EVEN READ. Nothing a stranger sends should
     reach any code that does work. */
  if (!sameSecret(req.headers.get('x-support-secret') ?? '', BRIDGE)) {
    console.warn('[support-whatsapp-send] refused: wrong or missing secret')
    return json({ ok: false, reason: 'not_allowed' }, 401)
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ ok: false, reason: 'bad_json' }, 400) }

  const phone = normalizePhone(String(body.phone ?? ''))
  const text  = String(body.body ?? '').trim()

  if (!phone)             return json({ ok: false, reason: 'no_phone' }, 400)
  if (!text)              return json({ ok: false, reason: 'empty' }, 400)
  if (text.length > 4000) return json({ ok: false, reason: 'too_long' }, 400)

  /* type 'text', not 'template'. Inside the customer service window this is
     allowed and free. preview_url is false so a link in a support answer does
     not drag an unrelated preview card into the conversation. */
  let waResult: Record<string, unknown>
  try {
    const res = await fetch(
      'https://graph.facebook.com/v19.0/' + WA_PHONE_ID + '/messages',
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + WA_TOKEN },
        body:    JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type:    'individual',
          to:   phone,
          type: 'text',
          text: { preview_url: false, body: text },
        }),
      },
    )
    waResult = await res.json()
  } catch (e) {
    console.error('[support-whatsapp-send] fetch threw', String(e))
    return json({ ok: false, reason: 'network' }, 502)
  }

  if (waResult.error) {
    const err = waResult.error as Record<string, unknown>
    const code = Number(err.code ?? 0)
    const detail = JSON.stringify(err).slice(0, 400)

    /* THE ONE REFUSAL THAT IS NOT A FAULT. 131047 is Meta saying the 24 hour
       window has closed, and 131026 is the message being undeliverable to
       that number. Both are named so StellaXafe can fall back to email and
       tell the staff member the real reason, rather than showing them
       "something went wrong" for a rule that is working as designed. */
    const windowClosed = code === 131047 || code === 131026 ||
      /24 hour|re-?engagement|outside the allowed window/i.test(String(err.message ?? ''))

    console.error('[support-whatsapp-send] Meta refused', detail)
    return json({
      ok: false,
      reason: windowClosed ? 'window_closed' : 'meta_error',
      detail,
    }, windowClosed ? 409 : 502)
  }

  const waId = ((waResult.messages as Record<string, unknown>[] | undefined)?.[0]?.id as string) ?? null

  /* NOTHING IS WRITTEN HERE ON PURPOSE. The conversation this answers lives
     in StellaXafe's support_messages, and StellaXafe writes the line itself
     once this returns ok. Writing a second copy into Amara would give the
     same reply two homes and no way to tell which is the record. */
  console.log('[support-whatsapp-send] sent to', phone)
  return json({ ok: true, wa_message_id: waId })
})
