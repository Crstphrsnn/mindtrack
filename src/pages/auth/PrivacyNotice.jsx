import React from "react";
import { Link } from "react-router-dom";
import psuLogo from "../../assets/psu-logo.jpg";
import { PRIVACY_NOTICE_VERSION } from "../../utils/privacyConsent";
import "../../registration-ux.css";

// Draft: requires PSU Data Protection Officer approval before production publication.
export default function PrivacyNotice() {
  return (
    <main className="auth-page mindtrack-privacy">
      <article className="auth-card privacy-notice-card mt-privacy-card">
        <header className="mt-privacy-header">
          <div className="mt-privacy-brand">
            <img src={psuLogo} alt="Pangasinan State University logo" className="mt-privacy-logo" />
            <div><span>MINDTRACK · PSU GUIDANCE SERVICES</span><h1>MindTrack Privacy Policy</h1></div>
          </div>
          <p className="mt-privacy-intro">How MindTrack handles personal information, psychological assessments, and counseling records.</p>
          <p>Policy version: {PRIVACY_NOTICE_VERSION} · Effective date: Pending University approval</p>
        </header>
        <div className="mt-privacy-sections">
          <details className="mt-privacy-accordion" id="privacy-overview">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">01</span>
              <h2 className="mt-privacy-accordion-title">Overview</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content">
              <p>MindTrack is a web-based mental health monitoring and counseling support system developed for the Pangasinan State University – Lingayen Campus community. It supports psychological assessments, student mental health monitoring, counseling requests, referrals, and guidance services.</p>
              <p>This notice explains how personal and sensitive information is collected, used, accessed, and protected. Psychological screening results support guidance services and are not a medical diagnosis.</p>
            </div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-collected">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">02</span>
              <h2 className="mt-privacy-accordion-title">Information We Collect</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content">
              <p>Account and profile information: name, institutional email address, student or employee ID, role, college or department, academic program where applicable, contact information, address, and optional social media details when provided.</p>
              <p>Emergency contact information: the designated contact person’s name and phone number.</p>
              <p>Psychological assessment information: questionnaire responses, scores, severity interpretations, assessment dates, and review records for applicable WHO-5, PHQ-9, GAD-7, and DASS-21 screening tools.</p>
              <p>Student monitoring information: assessment-based severity history and comparisons of previous and recent assessments.</p>
              <p>Counseling and referral information: requests, appointments, follow-up sessions, referrals, counselor remarks, and restricted counseling documentation.</p>
              <p>System information: authentication and privacy-notice acknowledgment details necessary for operating and securing the service.</p>
            </div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-purpose">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">03</span>
              <h2 className="mt-privacy-accordion-title">How We Use Your Information</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content">
              <p>To verify accounts and manage authorized user access; administer psychological assessments; present student monitoring information; support assigned counselors in reviewing assessments; coordinate counseling appointments, follow-up sessions and referrals; and maintain records for authorized guidance services.</p>
              <p>Information must not be used for unrelated purposes without an appropriate legal basis and required authorization.</p>
            </div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-access">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">04</span>
              <h2 className="mt-privacy-accordion-title">Who Can Access Your Information</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content">
              <p>Students can access their own account information, student-visible monitoring, and permitted counseling records.</p>
              <p>Guidance Counselors may review assessment answers and counseling information for students currently assigned to them, subject to authorization checks.</p>
              <p>Teaching and Non-teaching Personnel may access permitted referral information and status updates relating to their submissions, but not confidential assessment answers or private counseling notes.</p>
              <p>Super Administrators have access according to implemented administrative permissions; some identifiable assessment records may be available through administrative functions. This does not automatically grant access to private counselor notes.</p>
              <p>Disclosure outside authorized guidance services must follow applicable law and approved university procedures. Emergency disclosures are not represented as an automatic MindTrack feature.</p>
            </div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-security">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">05</span>
              <h2 className="mt-privacy-accordion-title">How We Protect Your Information</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content">
              <p>MindTrack uses Supabase authentication, role-based application controls, database Row Level Security policies, counselor-assignment checks, and restricted functions for sensitive records. These controls require ongoing verification and maintenance.</p>
              <p>No online system can guarantee absolute security. Specific encryption algorithms or transport protocol versions are not asserted in this notice.</p>
            </div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-retention">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">06</span>
              <h2 className="mt-privacy-accordion-title">Data Retention</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content">
              <p>Personal information, assessment records, and counseling documentation should be retained, archived, or securely disposed of according to the University’s approved records retention schedule and applicable Philippine law.</p>
              <p>The University must confirm the applicable retention periods and deletion procedures before this notice is finalized. Account deactivation does not necessarily result in immediate deletion of all records.</p>
            </div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-rights">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">07</span>
              <h2 className="mt-privacy-accordion-title">Your Rights and Choices</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content">
              <p>Under Republic Act No. 10173 (Data Privacy Act of 2012), individuals have applicable rights to be informed, access personal data, request correction, object to certain processing, and request erasure or blocking where legally appropriate.</p>
              <p>Requests may require identity verification and may be subject to lawful retention obligations. Contact the University’s designated Data Protection Officer through official university channels. The University must confirm the contact details and procedures.</p>
            </div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-cookies">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">08</span>
              <h2 className="mt-privacy-accordion-title">Cookies and Sessions</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content">
              <p>MindTrack uses essential browser storage and authentication tokens for login sessions and application functionality. Browser local storage is not the same as an HTTP cookie.</p>
              <p>The application is not designed to use advertising or behavioral-tracking cookies. Cookies or other technologies introduced by hosting or third-party services must be reviewed and disclosed as appropriate. Log out when using shared devices.</p>
            </div>
          </details>
          <details className="mt-privacy-accordion" id="privacy-changes">
            <summary className="mt-privacy-accordion-trigger">
              <span className="mt-privacy-index" aria-hidden="true">09</span>
              <h2 className="mt-privacy-accordion-title">Changes to This Policy</h2>
              <span className="mt-privacy-chevron" aria-hidden="true" />
            </summary>
            <div className="mt-privacy-accordion-content">
              <p>The University may revise this notice to reflect changes in system functionality, institutional policies, or legal requirements. Updates should be published with a revised version and effective date, and material changes communicated where required.</p>
            </div>
          </details>
        </div>
        <footer className="mt-privacy-footer">
          <div><strong>Ready to continue?</strong><p>Return to registration to complete your details and review the privacy acknowledgment.</p></div>
          <Link className="mt-privacy-continue" to="/register">Back to Registration</Link>
        </footer>
      </article>
    </main>
  );
}
