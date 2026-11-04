import React from "react";
import { Link } from "react-router-dom";
import psuLogo from "../../assets/psu-logo.jpg";
import { PRIVACY_NOTICE_VERSION } from "../../utils/privacyConsent";
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
          <div className="mt-privacy-status">
            <span>Version {PRIVACY_NOTICE_VERSION}</span>
            <span>For PSU review before production release</span>
          </div>
        </header>

        <div className="mt-privacy-at-a-glance" aria-label="Privacy notice at a glance">
          <div><span className="mt-privacy-summary-number">01</span><strong>What we collect</strong><p>Account details, contact information, and records related to services you use.</p></div>
          <div><span className="mt-privacy-summary-number">02</span><strong>Why we use it</strong><p>To manage registration, screening, referrals, and counseling services.</p></div>
          <div><span className="mt-privacy-summary-number">03</span><strong>Who may see it</strong><p>Access is based on authorized roles and the service involved.</p></div>
        </div>

        <div className="mt-privacy-sections">
          <section id="privacy-collected"><span className="mt-privacy-index">01</span><div><h2>Information collected</h2><p>For registration, MindTrack collects your name, PSU email, role, student or employee number, program or college, contact details, address, and emergency contact. When you use applicable services, the system may also process referral information, mental-health screening responses, counseling requests, and counselor documentation.</p></div></section>
          <section id="privacy-purpose"><span className="mt-privacy-index">02</span><div><h2>Why the information is used</h2><p>To verify accounts, connect students with authorized guidance personnel, administer screening and referral workflows, manage counseling requests, send service updates, and maintain records needed for responsible university guidance services. Screening results are not a medical diagnosis.</p></div></section>
          <section id="privacy-access"><span className="mt-privacy-index">03</span><div><h2>Who may access information</h2><p>Access depends on your role and the service involved. Authorized Guidance Counselors can review assigned cases. Teaching and Non-teaching staff can see progress updates only for referrals they submitted; they cannot see private counseling notes or psychological assessment scores. Administrative access is limited by applicable system permissions.</p></div></section>
          <section id="privacy-security"><span className="mt-privacy-index">04</span><div><h2>Storage, retention, and security</h2><p>MindTrack uses Supabase authentication and access controls. Records should be retained and disposed of according to PSU's approved retention schedule and applicable law; a specific retention period has not yet been provided for this notice. No online system can guarantee absolute security.</p></div></section>
          <section id="privacy-rights"><span className="mt-privacy-index">05</span><div><h2>Your privacy rights</h2><p>Subject to applicable Philippine data-protection law and institutional policy, you may request access, correction, or other appropriate action concerning your personal information. Contact PSU's designated Data Protection Officer through the university's official channels. The university must confirm the official contact details and procedures before this notice is finalized.</p></div></section>
          <section id="privacy-consent"><span className="mt-privacy-index">06</span><div><h2>Consent and updates</h2><p>Registration requires acknowledgment of this notice. Where required, separate consent will be requested for sensitive screening or counseling activities. Updates to the notice should be reviewed and published with a new version.</p></div></section>
        </div>

        <footer className="mt-privacy-footer">
          <div><strong>Ready to continue?</strong><p>Return to registration to complete your details and review the consent checkbox.</p></div>
          <Link className="mt-privacy-continue" to="/register">Back to Registration</Link>
        </footer>
      </article>
    </main>
  );
}
