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
    recognition.continuous = false;
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
      /* "aborted" fires on our own stop() calls, that is not a real error. */
      if (event.error !== "aborted") setError(event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      onEndRef.current?.();
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    };
  }, [supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setError("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      /* start() throws if a session is already open, safe to ignore */
    }
  }, [listening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, error, start, stop };
}
