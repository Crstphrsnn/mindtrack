import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/MINDTRACK_STUDENT_VACANT_TIME.sql', import.meta.url), 'utf8');

test('student profile includes independently saved vacant time', () => {
  const profile = app.slice(app.indexOf('function Profile()'), app.indexOf('function UserProfiles()'));
  assert.match(profile, /user\.role === "student" && <StudentVacantTime studentId=\{user\.id\}/);
});
test('reschedule validates student vacant hours before saving', () => {
  const management = app.slice(app.indexOf('function CounselingRequestsManagement()'), app.indexOf('function Schedule()'));
  assert.match(management, /getStudentVacantSlots\(selected\.ownerId\)/);
  assert.match(management, /isStudentVacantAt\(latestVacantSlots, rescheduleDate, rescheduleTime\)/);
  assert.match(management, /outside student vacant hours/);
});
test('monitoring trend comes before current reviewed monitoring summary', () => {
  const monitoring = app.slice(app.indexOf('function UserMonitoringContent('), app.indexOf('function StudentHistory('));
  assert.ok(monitoring.indexOf('panel monitoring-trend-panel') < monitoring.indexOf('panel monitoring-summary-panel'));
});
test('transfer tools in schedule only appear for Transfers filter', () => {
  const schedule = app.slice(app.indexOf('function Schedule()'), app.indexOf('function ReportsAndAnalytics()') > 0 ? app.indexOf('function ReportsAndAnalytics()') : undefined);
  assert.match(schedule, /!isSuperAdmin && scheduleFilter === "Transfers"/);
  assert.match(schedule, /"\/transfers"/);
});
test('assessment mobile progress is compact and explanation appears after submission', () => {
  assert.match(css, /\.assessment-sticky-progress \.assessment-page-stepper \{ display: none; \}/);
  assert.match(app, /What happens next\?/);
});
test('availability SQL protects reads and writes with scoped RPCs', () => {
  assert.match(sql, /SECURITY DEFINER SET search_path = ''/);
  assert.match(sql, /ca\.counselor_id = v_caller/);
  assert.match(sql, /p\.role = 'student'/);
  assert.match(sql, /REVOKE ALL ON public\.mindtrack_student_vacant_slots/);
});
