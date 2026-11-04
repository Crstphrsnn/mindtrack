import React from "react";
import { Link } from "react-router-dom";
import psuLogo from "../../assets/psu-logo.jpg";
import "../../registration-ux.css";

// Draft privacy notice for review by PSU's Data Protection Officer.
// Do not publish unreviewed institution-specific retention periods or contact details.
export default function PrivacyNotice() {
  return (
    <main className="auth-page mindtrack-privacy">
      <article className="auth-card privacy-notice-card mt-privacy-card">
        <header className="mt-privacy-header">
          <div className="mt-privacy-brand">
            <img src={psuLogo} alt="Pangasinan State University logo" className="mt-privacy-logo" />
            <div><span>MINDTRACK · PSU GUIDANCE SERVICES</span><h1>MindTrack Privacy Notice</h1></div>
          </div>
          <p className="mt-privacy-intro">A clear guide to the information MindTrack uses, why it is needed, and who may access it.</p>
        </header>

        <div className="mt-privacy-sections">
          <details className="mt-privacy-accordion" id="privacy-collected" open>
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">01</span>
              <h2 className="mt-privacy-accordion-title">Information collected</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content"><p>For registration, MindTrack collects your name, PSU email, role, student or employee number, program or college, contact details, address, and emergency contact. When you use applicable services, the system may also process referral information, mental-health screening responses, counseling requests, and counselor documentation.</p></div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-purpose">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">02</span>
              <h2 className="mt-privacy-accordion-title">Why the information is used</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content"><p>To verify accounts, connect students with authorized guidance personnel, administer screening and referral workflows, manage counseling requests, send service updates, and maintain records needed for responsible university guidance services. Screening results are not a medical diagnosis.</p></div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-access">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">03</span>
              <h2 className="mt-privacy-accordion-title">Who may access information</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content"><p>Access depends on your role and the service involved. Authorized Guidance Counselors can review assigned cases. Teaching and Non-teaching staff can see progress updates only for referrals they submitted; they cannot see private counseling notes or psychological assessment scores. Administrative access is limited by applicable system permissions.</p></div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-security">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">04</span>
              <h2 className="mt-privacy-accordion-title">Storage, retention, and security</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content"><p>MindTrack uses Supabase authentication and access controls. Records should be retained and disposed of according to PSU's approved retention schedule and applicable law; a specific retention period has not yet been provided for this notice. No online system can guarantee absolute security.</p></div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-rights">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">05</span>
              <h2 className="mt-privacy-accordion-title">Your privacy rights</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content"><p>Subject to applicable Philippine data-protection law and institutional policy, you may request access, correction, or other appropriate action concerning your personal information. Contact PSU's designated Data Protection Officer through the university's official channels. The university must confirm the official contact details and procedures before this notice is finalized.</p></div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-consent">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">06</span>
              <h2 className="mt-privacy-accordion-title">Consent and updates</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content"><p>Registration requires acknowledgment of this notice. Where required, separate consent will be requested for sensitive screening or counseling activities. Updates to the notice should be reviewed and published with a new version.</p></div>
          </details>
        </div>

        <footer className="mt-privacy-footer">
          <div><strong>Ready to continue?</strong><p>Return to registration to complete your details and review the consent checkbox.</p></div>
          <Link className="mt-privacy-continue" to="/register">Back to Registration</Link>
        </footer>
      </article>
    </main>
  );
}
