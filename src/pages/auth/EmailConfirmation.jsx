import React from "react";
import psuLogo from "../../assets/psu-logo.jpg";
import { useAuth } from "../../context/AuthContext";

/**
 * Supabase's signup redirect lands here. AuthProvider consumes the temporary
 * confirmation session, signs it out, then navigates to /login.
 */
export default function EmailConfirmation() {
  const { loading } = useAuth();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img
          src={psuLogo}
          alt="Pangasinan State University Logo"
          className="auth-logo-image"
        />
        <h1>Confirming Your Email</h1>
        {loading ? (
          <p>Verifying your email and preparing the login page…</p>
        ) : (
          <>
            <p>
              Email confirmation could not be completed automatically.
              Please reload this page. If the link has expired, request a
              new verification email from the login page.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              Retry Confirmation
            </button>
          </>
        )}
      </div>
    </div>
  );
}
