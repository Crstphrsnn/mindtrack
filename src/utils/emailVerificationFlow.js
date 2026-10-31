/**
 * Email confirmation is verification only, never a MindTrack login.
 * This module has no React dependencies so the redirect rules can be tested.
 */
export const EMAIL_VERIFICATION_NOTICE = "mindtrack_email_verification_notice";
export const EMAIL_VERIFICATION_REDIRECT_PATH = "/auth/confirm";

export function isEmailVerificationCallbackUrl(value) {
  if (!value) return false;
  const url = new URL(value, "https://mindtrack.invalid");
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  return (
    url.pathname === EMAIL_VERIFICATION_REDIRECT_PATH ||
    (url.pathname === "/login" && url.searchParams.get("mindtrack_verified") === "1") ||
    // Older implicit-flow confirmation emails may return to the Site URL.
    (hash.get("type") === "signup" && hash.has("access_token"))
  );
}

export function hasEmailVerificationLinkError(value) {
  const url = new URL(value, "https://mindtrack.invalid");
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  return Boolean(url.searchParams.get("error") || hash.get("error"));
}

/**
 * A confirmation link can create a Supabase session. Always clear that
 * session on this device before returning the user to the login screen.
 * Never use this for password-recovery links: they need their session to
 * call updateUser({ password }).
 */
export async function completeEmailVerification(auth, callbackUrl) {
  const { data, error } = await auth.getSession();
  if (error) throw error;

  const verified =
    !hasEmailVerificationLinkError(callbackUrl) &&
    Boolean(data?.session?.user?.email_confirmed_at);

  // Use local scope so verifying on a phone doesn't log out sessions on
  // the user's other devices. Also clear a pre-existing local session.
  const { error: signOutError } = await auth.signOut({ scope: "local" });
  if (signOutError) throw signOutError;

  return verified ? "verified" : "not_verified";
}
