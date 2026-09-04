/* ==========================================================================
   SPEECH TO TEXT
   Wraps the browser's own speech recognition, no server round trip, no key,
   nothing to configure. Chrome, Edge, and most mobile browsers support it
   under a vendor prefix, so it is checked for and quietly hidden where it
   is not there rather than showing a control that cannot work.

   The recognition object is built once and kept in a ref, not rebuilt on
   every render. Rebuilding it while someone is mid sentence would cut the
   session, which is exactly the bug this file exists to avoid.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechToText({ onResult, onEnd } = {}) {
  const recognitionRef = useRef(null);

  /* Whether the person still wants to be heard, which is not the same as
     whether the browser is still listening. Speech recognition ends its
     own session on a pause, and on Android it does so after a second or
     two of quiet. Somebody thinking mid sentence had the mic switch itself
     off on them. This ref is what the session is restarted against. */
  const wantListeningRef = useRef(false);

  /* Callbacks read through refs, so the recognition object itself never
     has to be rebuilt just because the caller re-rendered with a new
     function identity. */
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  onResultRef.current = onResult;
  onEndRef.current = onEnd;

  const [supported] = useState(
    () => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supported) return;

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Ctor();
    /* Keep the session open across pauses instead of ending on the first
       gap. Browsers still end it on their own, which is what the restart
       below is for. */
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      onResultRef.current?.(transcript, isFinal);
    };

    recognition.onerror = (event) => {
      /* "aborted" fires on our own stop() calls, that is not a real error.
         "no-speech" is a pause, not a failure, and the restart below picks
         it straight back up. */
      if (event.error === "no-speech") return;
      if (event.error !== "aborted") {
        setError(event.error);
        wantListeningRef.current = false;
      }
      setListening(false);
    };

    recognition.onend = () => {
      /* The browser ended the session but the person never pressed stop,
         so open another one. Without this, a pause to think is the end of
         dictation. */
      if (wantListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          /* Already restarting, or the tab lost the microphone. Fall
             through and let the mic show as off rather than lie. */
        }
      }
      setListening(false);
      onEndRef.current?.();
    };

    recognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    };
  }, [supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setError("");
    wantListeningRef.current = true;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      /* start() throws if a session is already open, safe to ignore */
    }
  }, [listening]);

  const stop = useCallback(() => {
    /* Cleared first, so the session ending does not restart itself. */
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop };
}
