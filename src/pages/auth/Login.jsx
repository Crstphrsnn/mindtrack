import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import psuLogo from "../../assets/psu-logo.jpg";
import { useAuth } from "../../context/AuthContext";
import PasswordField from "../../components/PasswordField";

// ======================================================
// DEFAULT PAGE BY ROLE
// ======================================================

function getDefaultPage() {

  return "/dashboard";
}


// ======================================================
// LOGIN
// ======================================================

export default function Login() {
  const {
    user,
    login,
    resendVerificationEmail,
    loading: authLoading,
    supabaseEnabled
  } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    needsVerification,
    setNeedsVerification
  ] = useState(false);

  const [
    verificationMessage,
    setVerificationMessage
  ] = useState("");



  // AuthProvider processes the verification redirect, signs out the
  // temporary session, and stores a one-time notice for the login page.
  useEffect(() => {
    if (authLoading) return;
    const notice = sessionStorage.getItem("mindtrack_email_verification_notice");
    if (!notice) return;
    sessionStorage.removeItem("mindtrack_email_verification_notice");
    if (notice === "verified") {
      setVerificationMessage("Email verified successfully. You can now log in.");
      setNeedsVerification(false);
      setError("");
    } else {
      setError("Email verification could not be confirmed. Please open a valid verification link or request another email.");
      setNeedsVerification(true);
    }
  }, [authLoading]);


  // Compatibility with recovery emails sent by earlier MindTrack versions.
  // AuthContext waits for the recovery session before allowing this redirect.
  // The reset page returns here after updating the password and signing out.
  // Remove the success query parameter so refresh doesn't replay the notice.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") !== "success") return;
    setVerificationMessage("Password updated successfully. Log in with your new password.");
    params.delete("reset");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    );
  }, []);

  if (new URLSearchParams(window.location.search).get("mode") === "recovery") {
    // Preserve any token/code parameters on links issued by older versions.
    const legacyParams = new URLSearchParams(window.location.search);
    legacyParams.delete("mode");
    const query = legacyParams.toString();
    return (
      <Navigate
        to={`/reset-password${query ? `?${query}` : ""}${window.location.hash}`}
        replace
      />
    );
  }

  if (user && !authLoading && !new URLSearchParams(window.location.search).has("mindtrack_verified")) {
    return (
      <Navigate
        to={getDefaultPage(user)}
        replace
      />
    );
  }


  async function submit(e) {
    e.preventDefault();

    setError("");
    setNeedsVerification(false);
    setVerificationMessage("");
    setLoading(true);

    try {

      await login(
        email,
        password
      );

      navigate("/dashboard");

    } catch (err) {

      console.error(
        "Login error:",
        err
      );

      if (
        err.code ===
        "auth/invalid-credential"
      ) {
        setError(
          "Invalid email or password."
        );

      } else if (
        err.code ===
        "auth/user-not-found"
      ) {
        setError(
          "Account not found."
        );

      } else if (
        err.code ===
        "auth/wrong-password"
      ) {
        setError(
          "Incorrect password."
        );

      } else if (
        err.code ===
        "auth/email-not-verified"
      ) {

        setError(
          "Your institutional email has not been verified yet. Open the verification email sent to your PSU account, then try logging in again."
        );

        setNeedsVerification(true);

      } else if (
        err.code ===
        "auth/institutional-email-required"
      ) {

        setError(
          "This account does not use an approved PSU institutional email address."
        );

      } else if (
        err.code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Too many login attempts. Please try again later."
        );

      } else {

        setError(
          err.message ||
          "Unable to login."
        );

      }

    } finally {

      setLoading(false);

    }
  }


  async function resendVerification() {

    setError("");
    setVerificationMessage("");


    if (!email.trim()) {

      setError(
        "Enter your institutional email first, then resend the verification email."
      );

      return;
    }


    try {

      setLoading(true);


      const result =
        await resendVerificationEmail(
          email,
          password
        );


      if (
        result ===
        "already-verified"
      ) {

        setNeedsVerification(false);

        setVerificationMessage(
          "Your email is already verified. You can now log in."
        );

      } else {

        setNeedsVerification(true);

        setVerificationMessage(
          "A new verification email was sent to your institutional email address."
        );
      }

    } catch (err) {

      console.error(
        "Resend verification error:",
        err
      );


      setError(
        err?.message ||
        "Unable to resend the verification email."
      );

    } finally {

      setLoading(false);
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

        <h1>
          MindTrack
        </h1>

        <p>
          PSU Lingayen Mental Health Monitoring System
        </p>


        <form onSubmit={submit} autoComplete="off">

          <label>
            Email

            <input
              value={email}
              onChange={
                event =>
                  setEmail(
                    event.target.value
                  )
              }
              type="email"
              name="mindtrack-login-email"
              placeholder="email@psu.edu.ph"
              autoComplete="username"
              required
            />

          </label>


          <PasswordField
            label="Password"
            name="mindtrack-login-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />


          {supabaseEnabled && (

            <div className="forgot-password-row">

              <button
                type="button"
                className="forgot-password-link"
                onClick={() => navigate("/forgot-password")}
                disabled={loading}
              >
                Forgot password?
              </button>

            </div>

          )}


          {error && (
            <div className="error-box">
              {error}
            </div>
          )}


          {verificationMessage && (
            <div className="success-box">
              {verificationMessage}
            </div>
          )}



          {needsVerification && (

            <button
              type="button"
              className="secondary-button auth-resend-button"
              disabled={loading}
              onClick={resendVerification}
            >
              Resend verification email
            </button>

          )}


          <button
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

        </form>


        {supabaseEnabled && (

          <div className="auth-switch">

            <span>
              Don't have an account?
            </span>

            <button
              type="button"
              className="register-link"
              onClick={
                () =>
                  navigate("/register")
              }
            >
              Register
            </button>

          </div>

        )}


        {!supabaseEnabled && (

          <div className="demo-accounts">

            <strong>
              Demo accounts — password:
              password123
            </strong>


            {[
              "student@psu.edu.ph",
              "faculty@psu.edu.ph",
              "personnel@psu.edu.ph",
              "counselor.ccs@psu.edu.ph",
              "superadmin@psu.edu.ph"
            ].map(emailAddress => (

              <button
                key={emailAddress}
                type="button"
                onClick={
                  () =>
                    setEmail(
                      emailAddress
                    )
                }
              >
                {emailAddress}
              </button>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}
