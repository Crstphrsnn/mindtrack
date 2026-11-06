import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const jsx = fs.readFileSync(path.join(root, 'src/pages/auth/Register.jsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/registration-ux.css'), 'utf8');
const helper = fs.readFileSync(path.join(root, 'src/utils/registrationDraft.js'), 'utf8');

test('Privacy Notice opens in the same tab and saves the form and address choices', () => {
  assert.match(jsx, /<Link to="\/privacy-notice" onClick=\{\(\) => saveRegistrationDraft\(\{/);
  assert.match(jsx, /form, privacyAccepted, regions, provinces, municipalities, barangays/);
  assert.doesNotMatch(jsx, /<Link to="\/privacy-notice"[^>]*target="_blank"/);
});

test('Registration restores every form value, privacy checkbox, and address dropdown', () => {
  assert.match(jsx, /useState\(\(\) => restoredDraft\?\.form \?\?/);
  for (const name of ['regions', 'provinces', 'municipalities', 'barangays']) {
    assert.match(jsx, new RegExp(`useState\\(\\(\\) => restoredDraft\\?\\.${name} \\?\\? \\[\\]\\)`));
  }
  assert.match(jsx, /useState\(\(\) => Boolean\(restoredDraft\?\.privacyAccepted\)\)/);
});

test('No blue guide sidebar; registration is a single centered column with PSU branding', () => {
  assert.doesNotMatch(jsx, /<aside className="mt-reg-guide"/);
  assert.match(jsx, /className="mt-reg-header-brand"/);
  assert.match(css, /width: min\(880px, 100%\);\s*margin: 0 auto;\s*display: block;/);
});

test('Draft remains in memory only, and is cleared on registration success', () => {
  assert.doesNotMatch(helper, /\b(?:localStorage|sessionStorage)\s*\./);
  assert.match(jsx, /clearRegistrationDraft\(\);\s*navigate\("\/login"\)/);
});

test('Draft utility restores form, address options and privacy state; clears cleanly', async () => {
  const url = pathToFileURL(path.join(root, 'src/utils/registrationDraft.js')).href;
  const { saveRegistrationDraft, peekRegistrationDraft, clearRegistrationDraft } = await import(url);
  clearRegistrationDraft();
  const data = {
    form: { firstName: 'Test', email: 'test@psu.edu.ph', password: 'example-secret', regionCode: '010000000' },
    privacyAccepted: true,
    regions: [{ code: '010000000', name: 'Region I' }],
    provinces: [{ code: '012800000', name: 'Ilocos Norte' }],
    municipalities: [{ code: '012801000', name: 'City' }],
    barangays: [{ code: '012801001', name: 'Barangay' }]
  };
  saveRegistrationDraft(data);
  assert.deepEqual(peekRegistrationDraft(), data);
  data.form.firstName = 'Changed';
  assert.equal(peekRegistrationDraft().form.firstName, 'Test');
  clearRegistrationDraft();
  assert.equal(peekRegistrationDraft(), null);
});
