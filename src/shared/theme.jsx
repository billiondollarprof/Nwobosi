/* ==========================================================================
   THEME
   One provider drives every page. Components read CSS custom properties
   rather than branching on the active theme themselves.
   ========================================================================== */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { THEME_VARS } from "./tokens";

const STORAGE_KEY = "stellaxafe.theme";

const ThemeContext = createContext(null);

/* --------------------------------------------------------------------------
   SECTION: Stored preference
   Storage can throw in private windows, so every access is guarded.
   -------------------------------------------------------------------------- */

function readStoredChoice() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* storage unavailable, fall through to the default */
  }
  return "dark";
}

function writeStoredChoice(choice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* storage unavailable, the choice still applies for this session */
  }
}

/* --------------------------------------------------------------------------
   SECTION: Provider
   -------------------------------------------------------------------------- */

export function ThemeProvider({ children }) {
  const [themeChoice, setThemeChoiceState] = useState(readStoredChoice);
  const [systemPref, setSystemPref] = useState("dark");

  /* Follow the operating system setting and keep following it live. */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemPref(mq.matches ? "dark" : "light");
    const handler = (e) => setSystemPref(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const effectiveTheme = themeChoice === "system" ? systemPref : themeChoice;
  const vars = THEME_VARS[effectiveTheme];

  function setThemeChoice(choice) {
    setThemeChoiceState(choice);
    writeStoredChoice(choice);
  }

  /* Paint the page background so there is no flash behind the app shell. */
  useEffect(() => {
    document.body.style.backgroundColor = vars["--bg"];
    document.body.style.color = vars["--text-1"];
  }, [vars]);

  const value = useMemo(
    () => ({ themeChoice, setThemeChoice, effectiveTheme, vars }),
    [themeChoice, effectiveTheme, vars]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* --------------------------------------------------------------------------
   SECTION: Hook
   -------------------------------------------------------------------------- */

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}
