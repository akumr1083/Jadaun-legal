/* =========================================================
   Jadaun Legal — careers portal configuration
   ---------------------------------------------------------
   Fill in `submitEndpoint` (and, if your Edge Function
   verifies JWTs, `supabaseAnonKey`) after deploying the
   Supabase backend described in README.md.

   Until these values are present the form does not pretend
   to submit: it validates the application and offers a
   pre-filled email instead.
   ========================================================= */

window.JADAUN_CAREERS = {
  /* Example:
     "https://abcdefghijklm.supabase.co/functions/v1/submit-application" */
  submitEndpoint: "",

  /* Supabase anon (public) key. Safe to expose in the browser;
     all database and storage access happens inside the function. */
  supabaseAnonKey: "",

  /* Maximum resume size shown to candidates and enforced client-side. */
  maxResumeMB: 5,

  /* Where the email fallback sends applications. */
  contactEmail: "advabhaysingh07@gmail.com",
};
