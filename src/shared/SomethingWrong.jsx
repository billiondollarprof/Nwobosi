/* ==========================================================================
   SOMETHING IS WRONG

   The second button under a read back, and the box that opens where it was.

   WHY A BOX AND NOT A TURN
   Anthony, 2026-09-21, correcting a first version that asked the model to
   guess what it had got wrong:

     "The system doesn't have to suggest anything for you. It just asks you
      where. So you point the system to where something is wrong... when
      you click on something is wrong, then a drop down for you to type in
      what is wrong... Not the system trying to figure out what you think
      is wrong for you. That is not correct."

   He is right, and the reason is worth keeping. The person pressing this
   is the only one who knows what is wrong. A model guessing at it spends
   a turn, spends money, and puts words in their mouth that they then have
   to argue with before they can say the thing they already knew.

   So nothing is asked of any model here. The button becomes a box, they
   type the one thing they meant, and it goes into the conversation as
   their own words.

   WHY IT IS NOT JUST THE MAIN MESSAGE BOX
   Because the card would have to disappear for that, and then the read
   back they are correcting scrolls away with it. The answer belongs next
   to the thing it is about.

   WHY "WRONG" AND NOT "MISSING"
   Anthony asked which was safer. Missing is only one kind of wrong. A
   figure that is there but incorrect is not missing, and neither is a
   sentence that misunderstood him. "Something is wrong" covers all three,
   and it is the natural answer to the question above it, which is "Did I
   get that right?".
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { PrimaryButton } from "./ui.jsx";

export default function SomethingWrong({ onSend, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const boxRef = useRef(null);

  /* Straight into the box. Opening a place to type and making somebody
     find it with the mouse is half a control. */
  useEffect(() => {
    if (open) boxRef.current?.focus();
  }, [open]);

  function send() {
    const said = text.trim();
    if (!said || disabled) return;
    onSend(said);
    setText("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="w-full mt-2.5 rounded-[12px] border py-2.5 text-[13.5px] transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
      >
        Something is wrong
      </button>
    );
  }

  return (
    <div className="mt-2.5" style={{ animation: "sx-rise 0.2s ease" }}>
      {/* THE QUESTION IS PLAIN AND ASKS FOR TWO THINGS. What, and where.
          Anthony: "it should ask me what is missing, where and where is
          missing." Asking for both in the placeholder costs nothing and
          saves a round trip, because "the numbers are wrong" on its own
          sends it hunting. */}
      <textarea
        ref={boxRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          if (e.key === "Escape") { setOpen(false); setText(""); }
        }}
        rows={3}
        placeholder="What is wrong, and where? For example: the pricing section is missing the 2026 rates."
        className="w-full rounded-[12px] border px-3.5 py-2.5 text-[14px] leading-relaxed resize-none outline-none"
        style={{
          backgroundColor: "var(--surface-2)",
          borderColor: "var(--border-2)",
          color: "var(--text-1)",
        }}
      />

      <div className="flex gap-2.5 mt-2">
        <PrimaryButton
          onClick={send}
          disabled={disabled || !text.trim()}
          className="flex items-center gap-2 text-[13.5px] px-4"
        >
          <Send size={14} />
          Send
        </PrimaryButton>
        <button
          type="button"
          onClick={() => { setOpen(false); setText(""); }}
          className="px-4 py-2.5 rounded-[12px] border text-[13.5px] transition-opacity hover:opacity-80"
          style={{ borderColor: "var(--border-2)", color: "var(--text-2)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
