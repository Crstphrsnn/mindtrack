import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/referralService.js', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/01_REFERRAL_SLIP_DETAILS.sql', import.meta.url), 'utf8');
const referral = app.slice(app.indexOf('function Referrals()'), app.indexOf('function Feedback()'));

test('staff sidebar has no monitoring, students retain monitoring', () => {
  const staffMenu = layout.slice(layout.indexOf('  teaching:'), layout.indexOf('  counselor:'));
  assert.doesNotMatch(staffMenu, /"\/monitoring"/);
  const studentMenu = layout.slice(layout.indexOf('  student:'), layout.indexOf('  teaching:'));
  assert.match(studentMenu, /"\/monitoring"/);
  assert.match(app, /allowedRoles=\{\["student"\]\}\s*>\s*<Monitoring \/>/);
  assert.match(app, /return <Navigate to="\/referrals" replace \/>/);
});
test('staff see referral updates with status filters and notifications, not assessment scores', () => {
  assert.match(referral, /My Referral Updates/);
  assert.match(referral, /referralStatusOptions\.map\(status/);
  assert.match(referral, /visibleOwn\.map/);
  assert.match(referral, /Last updated:/);
  assert.match(referral, /mindtrack:referrals-changed/);
  assert.match(referral, /View referral slip/);
  assert.doesNotMatch(referral, /PHQ-9|DASS-21|WHO-5|GAD-7/);
});
test('PSU slip includes student fields, nature, recommendation, signature, position and date', () => {
  for (const field of ['Name of Student / Referred Person','Year Level','Age (if known)',
    'Address (if known)','Parent / Guardian (if known)','Nature of Problem',
    'Recommendation','Signature over Printed Name','Position','Date: Recorded automatically']) {
    assert.ok(referral.includes(field), `Missing field: ${field}`);
  }
  assert.match(referral, /await submitReferral\(form, user\)/);
});
test('submission and slip storage use a single atomic Supabase RPC', () => {
  assert.match(service, /rpc\("mindtrack_submit_referral_slip"/);
  assert.match(service, /p_slip: \{/);
  assert.match(service, /rpc\("mindtrack_get_referral_slip"/);
  assert.match(sql, /v_id := public\.mindtrack_submit_referral\(/);
  assert.match(sql, /INSERT INTO public\.referral_slip_details/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.referral_slip_details FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /r\.referrer_id = auth\.uid\(\)/);
  assert.match(sql, /assigned_counselor_id/);
  assert.match(sql, /p\.role = 'super_admin'/);
});
