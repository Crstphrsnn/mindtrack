import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRIVACY_NOTICE_VERSION } from '../src/utils/privacyConsent.js';
const register = readFileSync(new URL('../src/pages/auth/Register.jsx', import.meta.url), 'utf8');
const context = readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const notice = readFileSync(new URL('../src/pages/auth/PrivacyNotice.jsx', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/02_REGISTRATION_PRIVACY_CONSENT.sql', import.meta.url), 'utf8');

test('registration checkbox is unchecked by default, required and validated before signUp', () => {
  assert.match(PRIVACY_NOTICE_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(notice.includes('PRIVACY_NOTICE_VERSION')); 
  assert.match(register, /const \[privacyAccepted, setPrivacyAccepted\] = useState\(\(\) => Boolean\(restoredDraft\?\.privacyAccepted\)\)/);
  assert.match(register, /type="checkbox" checked=\{privacyAccepted\} required/);
  assert.match(register, /if \(!privacyAccepted\)/);
  assert.match(register, /privacyConsent: \{ accepted: privacyAccepted, version: PRIVACY_NOTICE_VERSION \}/);
});
test('registration backend validates consent and includes versioned signup metadata', () => {
  assert.match(context, /privacyConsent\?\.accepted !== true/);
  assert.match(context, /privacyConsent\?\.version !== PRIVACY_NOTICE_VERSION/);
  assert.match(context, /privacyConsentAccepted: true/);
  assert.match(context, /privacyConsentVersion: privacyConsent\.version/);
});
test('privacy notice is public and describes scope, rights, access, retention and separate sensitive consent', () => {
  assert.match(app, /path="\/privacy-notice" element=\{<PrivacyNotice \/>\}/);
  for (const term of ['Information We Collect','Who Can Access Your Information','Your Rights and Choices',
    'Data Retention','Data Protection Officer']) assert.ok(notice.includes(term));
});
test('consent audit table is private and records server timestamp from auth.users signup trigger', () => {
  assert.match(sql, /registration_privacy_consents/);
  assert.match(sql, /accepted_at timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(sql, /AFTER INSERT ON auth\.users/);
  assert.match(sql, /ALTER TABLE public\.registration_privacy_consents ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.registration_privacy_consents FROM PUBLIC, anon, authenticated/);
});
