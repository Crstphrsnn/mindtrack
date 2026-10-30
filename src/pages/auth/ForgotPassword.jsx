import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import psuLogo from "../../assets/psu-logo.jpg";
import { useAuth } from "../../context/AuthContext";

/**
 * Send a Supabase recovery email without revealing whether an address exists.
 * Passwords and reset tokens are never requested or stored on this page.
 */
export default function ForgotPassword() {
  const { resetPassword, supabaseEnabled } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    setSent(false);

    try {
      await resetPassword(email);
      // A generic message prevents email-account enumeration.
      setSent(true);
    } catch (err) {
      if (err?.code === "auth/institutional-email-required") {
        setError("Use your official PSU institutional email address.");
      } else if (
        err?.status === 429 ||
        /rate limit|too many requests|over_email_send_rate_limit/i.test(
          `${err?.code || ""} ${err?.message || ""}`
        )
      ) {
        setError("Too many reset requests. Please wait before trying again.");
      } else if (/network|fetch/i.test(err?.message || "")) {
        setError("Cannot connect to Supabase. Check your connection and try again.");
      } else {
        // Supabase may deliberately avoid revealing if an email exists.
        setSent(true);
      }
    } finally {
      setSending(false);
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
        <h1>Forgot Password?</h1>
        <p>Enter your registered PSU email to request a password reset link.</p>

        <form onSubmit={submit}>
          <label htmlFor="mindtrack-recovery-email">PSU Email Address</label>
          <input
            id="mindtrack-recovery-email"
            type="email"
            name="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="email@psu.edu.ph"
            autoComplete="email"
            required
            disabled={sending || !supabaseEnabled}
          />

          {error && <div className="error-box" role="alert">{error}</div>}
          {sent && (
            <div className="success-box" role="status">
              If an account is registered with that PSU email, a reset link will
              be sent. Check your inbox and spam folder.
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={sending || !supabaseEnabled}
          >
            {sending ? "Sending..." : sent ? "Send Another Reset Link" : "Send Reset Link"}
          </button>
        </form>

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
