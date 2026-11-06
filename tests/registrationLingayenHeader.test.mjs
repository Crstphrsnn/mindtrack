import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const register = fs.readFileSync(path.join(root, 'src/pages/auth/Register.jsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/registration-ux.css'), 'utf8');

test('registration header has PSU Lingayen branding and no redundant badge', () => {
  assert.match(register, /<strong>MindTrack<\/strong>/);
  assert.match(register, /<small>PSU Lingayen Guidance Services<\/small>/);
  assert.match(register, /<h1>Create your account<\/h1>/);
  assert.doesNotMatch(register, /<span className="mt-reg-eyebrow">CREATE YOUR ACCOUNT<\/span>/);
  assert.doesNotMatch(register, /<h1>Welcome to MindTrack<\/h1>/);
});

test('email verification message is clear and does not introduce icons', () => {
  assert.match(register, /<strong>Email verification required<\/strong>/);
  assert.match(register, /Check your PSU email and verify your account before signing in/);
  const header = register.split('<header className="mt-reg-form-header">')[1]?.split('</header>')[0] || '';
  assert.equal((header.match(/<img /g) || []).length, 1, 'PSU logo only');
  assert.doesNotMatch(header, /<svg|<i className=|<icon|mt-reg-eyebrow/);
});

test('five form sections remain numberless and accessible', () => {
  for (const section of ['account', 'personal', 'emergency', 'security', 'privacy']) {
    assert.match(register, new RegExp(`id="mt-reg-${section}"`));
  }
  assert.doesNotMatch(register, /className="mt-reg-section-number"/);
});

test('registration draft saving, privacy link, and form submission are preserved', () => {
  assert.match(register, /saveRegistrationDraft\(\{/);
  assert.match(register, /peekRegistrationDraft\(\)/);
  assert.match(register, /<form\s+onSubmit=\{submit\}/);
  assert.match(register, /<Link to="\/privacy-notice"/);
});

test('new CSS is scoped to registration, compact, and mobile-friendly', () => {
  assert.match(css, /MindTrack: compact PSU Lingayen registration header/);
  assert.match(css, /width: min\(800px, 100%\)/);
  assert.match(css, /\.mindtrack-registration \.mt-reg-header-brand small/);
  assert.match(css, /@media \(max-width: 600px\)/);
});
