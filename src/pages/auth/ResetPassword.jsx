import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import psuLogo from "../../assets/psu-logo.jpg";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabase";
import PasswordField from "../../components/PasswordField";

/**
 * Supabase handles the one-time recovery token before this page is rendered.
 * A valid recovery session is required by supabase.auth.updateUser().
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, logout } = useAuth();
  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const linkError = params.get("error") || hashParams.get("error");

    if (linkError) {
      setStatus("invalid");
      setError("This password reset link is invalid or expired. Request a new one.");
      return;
    }

    // Supabase fires PASSWORD_RECOVERY when the recovery URL is opened.
    // Do not perform async Supabase operations inside this callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        if (event === "PASSWORD_RECOVERY" && session?.user) {
          setError("");
          setStatus("ready");
        }
      }
    );

    // getUser validates the temporary session with the Supabase server.
    // It also supports returning to the page after the token was exchanged.
    async function checkSession() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (!active) return;
        if (authError || !data?.user) {
          setStatus(current => current === "ready" ? current : "invalid");
        } else {
          setStatus("ready");
        }
      } catch {
        if (active) setStatus("invalid");
      }
    }
    checkSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const minimumLengthMet = password.length >= 6;
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;

  async function submit(event) {
    event.preventDefault();
    if (saving || status !== "ready") return;
    setError("");

    if (!minimumLengthMet) {
      setError("Password must contain at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      // A recovery token creates an authenticated session. End it after use.
      try {
        await logout();
      } catch (signOutError) {
        console.error("Could not end password recovery session:", signOutError);
        // Best-effort local sign-out prevents an unused recovery session from
        // remaining in the browser if the server-side sign-out request fails.
        const { error: localError } = await supabase.auth.signOut({ scope: "local" });
        if (!localError) {
          navigate("/login?reset=success", { replace: true });
          return;
        }
        setStatus("updated");
        setError("Password changed, but automatic sign-out failed. Please sign out before logging in again.");
        return;
      }
      navigate("/login?reset=success", { replace: true });
    } catch (err) {
      if (/same password|different from the old/i.test(err?.message || "")) {
        setError("Choose a password different from your previous password.");
      } else if (/expired|session|jwt|token|not authenticated/i.test(err?.message || "")) {
        setStatus("invalid");
        setError("The reset session has expired. Request a new reset link.");
      } else {
        setError(err?.message || "Unable to update your password. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img
          src={psuLogo}
          alt="Pangasinan State University Logo"
          className="auth-logo-image"
        />
        <h1>Reset Password</h1>
        <p>Create a new password for your MindTrack account.</p>

        {status === "checking" && (
          <p role="status">Checking your password reset link...</p>
        )}

        {status === "ready" && (
          <form onSubmit={submit}>
            <PasswordField
              label="New Password"
              name="new-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Enter your new password"
              autoComplete="new-password"
              required
              hint={password
                ? minimumLengthMet
                  ? "Minimum length met"
                  : `At least ${6 - password.length} more character(s) needed`
                : "Use at least 6 characters"}
              hintTone={password ? minimumLengthMet ? "success" : "warning" : "neutral"}
            />
            <PasswordField
              label="Confirm New Password"
              name="confirm-new-password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              required
              hint={confirmPassword ? passwordsMatch ? "Passwords match" : "Passwords do not match" : ""}
              hintTone={passwordsMatch ? "success" : "warning"}
            />

            {error && <div className="error-box" role="alert">{error}</div>}
            <button
              type="submit"
              className="primary-button"
              disabled={saving || !minimumLengthMet || !passwordsMatch}
            >
              {saving ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        )}

        {(status === "invalid" || status === "updated") && (
          <>
            <div className={status === "updated" ? "success-box" : "error-box"} role="alert">
              {error || "Your password reset link is invalid or expired."}
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate(status === "updated" ? "/login" : "/forgot-password")}
            >
              {status === "updated" ? "Go to Login" : "Request New Reset Link"}
            </button>
          </>
        )}

        <div className="auth-switch">
          <button
            type="button"
            className="register-link"
            onClick={() => navigate("/login")}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
