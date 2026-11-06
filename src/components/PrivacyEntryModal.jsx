import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PRIVACY_NOTICE_VERSION } from "../utils/privacyConsent";
import "../privacy-entry-modal.css";
import psuLogo from "../assets/psu-logo.jpg";

const KEY = "mindtrack_privacy_entry_acknowledged_version";

function alreadyAcknowledged() {
  try { return window.localStorage.getItem(KEY) === PRIVACY_NOTICE_VERSION; }
  catch { return false; }
}

/** Public landing-page acknowledgment, not a substitute for registration consent. */
export default function PrivacyEntryModal({ children }) {
  const [visible, setVisible] = useState(() => !alreadyAcknowledged());

  const acknowledge = () => {
    try { window.localStorage.setItem(KEY, PRIVACY_NOTICE_VERSION); }
    catch { /* The notice will appear again if browser storage is unavailable. */ }
    setVisible(false);
  };

  return (
    <>
      {children}
      {visible && (
        <div className="mt-entry-overlay">
          <section className="mt-entry-dialog" role="dialog" aria-modal="true"
            aria-labelledby="mt-entry-title" aria-describedby="mt-entry-description">
            <div className="mt-entry-shield" aria-hidden="true"><img src={psuLogo} alt="" /></div>
            <h2 id="mt-entry-title">Before You Continue</h2>
            <p id="mt-entry-description">
              MindTrack processes information you provide to support psychological assessments,
              student mental health monitoring, and counseling services. Access to sensitive
              records is restricted according to authorized system roles.
            </p>
            <button className="mt-entry-accept" type="button" onClick={acknowledge} autoFocus>
              I Understand &amp; Agree
            </button>
            <Link className="mt-entry-policy" to="/privacy-policy">
              Read our Privacy Policy
            </Link>
            <small>Continuing acknowledges this policy. Registration has a separate privacy acknowledgment.</small>
          </section>
        </div>
      )}
    </>
  );
}
