import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const start = app.indexOf('function Referrals()');
const end = app.indexOf('// RATINGS & FEEDBACK', start);
const referral = app.slice(start, end);
const scoped = css.slice(css.indexOf('/* MindTrack Nov 2026: scoped PSU Referral Slip'));

test('referral form and updates panel use isolated responsive layout classes', () => {
  assert.ok(start >= 0 && end > start);
  for (const name of ['referral-page-grid', 'referral-slip-form', 'referral-updates-panel']) {
    assert.match(referral, new RegExp('className="[^"]*' + name + '[^"]*"'));
    assert.match(scoped, new RegExp('\\.' + name + '\\b'));
  }
  assert.match(scoped, /@media \(max-width: 1200px\)/);
  assert.match(scoped, /@media \(max-width: 620px\)/);
});

test('Submit and Refresh buttons share consistent 46px height and full width', () => {
  assert.match(referral, /className="primary-button referral-submit-button"/);
  assert.match(referral, /className="secondary-button referral-refresh-button"/);
  assert.match(scoped, /\.referral-slip-form > \.referral-submit-button,\s*\.referral-update-controls > \.referral-refresh-button \{[^}]*width: 100%;[^}]*height: 46px;[^}]*min-height: 46px;/s);
  assert.match(scoped, /\.referral-updates-panel > \.referral-update-controls \{[^}]*display: grid;/s);
});

test('field labels, selects, textareas and long text align consistently', () => {
  assert.match(scoped, /\.referral-slip-form label,\s*\.referral-update-controls label \{[^}]*flex-direction: column;[^}]*gap: 7px;/s);
  assert.match(scoped, /\.referral-slip-form label > input,\s*\.referral-slip-form label > select/);
  assert.match(scoped, /\.referral-slip-form label > textarea \{[^}]*min-height: 96px;/s);
  assert.match(referral, /Referred Person Type/);
  assert.match(referral, /Contact Number/);
});

test('referral cards align statuses and view-slip actions without changing behavior', () => {
  assert.match(referral, /className="record-card referral-update-card"/);
  assert.match(referral, /className="text-button referral-slip-toggle"/);
  assert.match(referral, /onClick=\{\(\) => setExpandedOwnReferralId/);
  assert.match(referral, /await submitReferral\(form, user\)/);
  assert.match(referral, /mindtrack:referrals-changed/);
  assert.match(scoped, /\.referral-updates-panel \.referral-update-card > \.status \{[^}]*float: none;/s);
});
