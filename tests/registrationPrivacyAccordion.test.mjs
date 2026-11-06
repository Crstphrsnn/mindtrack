import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const register = fs.readFileSync(path.join(root, 'src/pages/auth/Register.jsx'), 'utf8');
const privacy = fs.readFileSync(path.join(root, 'src/pages/auth/PrivacyNotice.jsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/registration-ux.css'), 'utf8');

test('registration has five titled sections without numbered badges', () => {
  for (const id of ['account','personal','emergency','security','privacy'])
    assert.match(register, new RegExp(`id="mt-reg-${id}"`));
  for (const title of ['Account details','Personal details','Emergency contact','Create a password','Privacy and consent'])
    assert.ok(register.includes(title), `Missing ${title}`);
  assert.doesNotMatch(register, /className="mt-reg-section-number"/);
});

test('privacy three-card summary and top navigation are absent', () => {
  assert.doesNotMatch(privacy, /mt-privacy-at-a-glance/);
  assert.doesNotMatch(privacy, /mt-privacy-summary-number/);
  assert.doesNotMatch(privacy, /mt-privacy-back|mt-privacy-toc/);
});

test('all nine privacy sections use native accessible expandable details/summary', () => {
  const ids = ['overview','collected','purpose','access','security','retention','rights','cookies','changes'];
  assert.equal([...privacy.matchAll(/<details className="mt-privacy-accordion"/g)].length, 9);
  assert.equal([...privacy.matchAll(/<summary className="mt-privacy-accordion-trigger">/g)].length, 9);
  assert.equal([...privacy.matchAll(/<\/details>/g)].length, 9);
  for (const id of ids) assert.match(privacy, new RegExp(`id="privacy-${id}"`));
});

test('privacy policy covers current nine-section scope and screening caveats', () => {
  for (const phrase of [
    'Overview', 'Information We Collect', 'How We Use Your Information',
    'Who Can Access Your Information', 'How We Protect Your Information',
    'Data Retention', 'Your Rights and Choices', 'Cookies and Sessions',
    'Changes to This Policy', 'not a medical diagnosis',
    'private counseling notes', 'No online system can guarantee absolute security',
    'Data Protection Officer'
  ]) assert.ok(privacy.includes(phrase), `Missing policy text: ${phrase}`);
  assert.match(privacy, /PRIVACY_NOTICE_VERSION/);
});

test('bottom Back to Registration remains and registration draft round trip is preserved', () => {
  assert.equal([...privacy.matchAll(/<Link className="mt-privacy-continue" to="\/register">Back to Registration<\/Link>/g)].length, 1);
  assert.match(register, /saveRegistrationDraft\(\{/);
  assert.match(register, /peekRegistrationDraft\(\)/);
  assert.match(register, /form, privacyAccepted, regions, provinces, municipalities, barangays/);
});

test('accordion has clear touch targets, focus outline, chevron, and mobile styles', () => {
  assert.match(css, /MindTrack UI: numberless registration headings and privacy accordion/);
  assert.match(css, /\.mt-privacy-accordion-trigger:focus-visible/);
  assert.match(css, /\.mt-privacy-chevron/);
  assert.match(css, /@media \(max-width: 600px\)/);
});
