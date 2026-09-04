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
   Dark is the default for everyone, on every device. The product is dark,
   the mark was drawn for a dark ground, and following the operating system
   meant half of all first visits landed on the version that was designed
   second. Light is a choice someone makes here, not one their phone makes
   for them.

   Storage can throw in private windows, so every access is guarded.
   -------------------------------------------------------------------------- */

function readStoredChoice() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
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

  /* There is nothing between the choice and the theme any more, but both
     names are kept: every screen reads effectiveTheme, and that stays true
     whatever the choice turns out to mean later. */
  const effectiveTheme = themeChoice;
  const vars = THEME_VARS[effectiveTheme];

  function setThemeChoice(choice) {
    setThemeChoiceState(choice);
    writeStoredChoice(choice);
  }

  function toggleTheme() {
    setThemeChoice(effectiveTheme === "dark" ? "light" : "dark");
  }

  /* Paint the page background so there is no flash behind the app shell. */
  useEffect(() => {
    document.body.style.backgroundColor = vars["--bg"];
    document.body.style.color = vars["--text-1"];
  }, [vars]);

  const value = useMemo(
    () => ({ themeChoice, setThemeChoice, toggleTheme, effectiveTheme, vars }),
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
