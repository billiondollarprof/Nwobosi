/* ==========================================================================
   ESLINT, AND IT CHECKS ONE THING ON PURPOSE

   WHY THIS FILE EXISTS
   --------------------
   On 2026-09-15 the admin knowledge base shipped a picture upload that
   could never run. stageFile called fileKind(), fileKind was never
   imported into that file, and the build was green because a bundler does
   not care about a name it has never heard of. The screen looked finished
   and the feature was dead. It was caught by clicking the button, which is
   the right way to catch it and the slow way.

   This is the fast way. no-undef is the rule that would have said so in
   half a second.

   WHY IT IS ONLY THAT RULE
   ------------------------
   A full style config on a codebase this size arrives as several hundred
   complaints about spacing, everybody turns it off, and the one rule that
   mattered goes with it. One rule that always passes is worth more than
   fifty that nobody runs.

   Add rules here when a real bug gets through that one would have caught.
   Not before.

     npm run lint
   ========================================================================== */

import globals from "globals";

/* A stub, and only a stub.

   Some files carry an eslint-disable comment for
   react-hooks/exhaustive-deps, written when that plugin was expected to be
   here. ESLint treats a disable comment for a rule it does not know as an
   error, so without this the config fails on a comment rather than on any
   code.

   Registering the name as a rule that does nothing keeps those comments
   meaningful as documentation and keeps this config about the one thing it
   is for. If the real hooks plugin is ever added, delete this and install
   it; do not leave both. */
const reactHooksStub = {
  rules: {
    "exhaustive-deps": { create: () => ({}) },
    "rules-of-hooks": { create: () => ({}) },
  },
};

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: { "react-hooks": reactHooksStub },
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
      "no-undef": "error",
      /* The other half of the same mistake: a name that IS imported and
         then never used means somebody moved code and left the import,
         which is how a file ends up importing a module it no longer needs
         and nobody notices it has gone stale. */
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
    },
  },
];
