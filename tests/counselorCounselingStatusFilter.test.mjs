import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const assessmentStart = app.indexOf('function AssessmentCases');
const counselingStart = app.indexOf('function CounselingRequestsManagement() {');
const counselingEnd = app.indexOf('\nfunction Schedule() {', counselingStart);
assert.ok(counselingStart !== -1 && counselingEnd > counselingStart, 'CounselingRequestsManagement found');
const counseling = app.slice(counselingStart, counselingEnd);
const before = app.slice(0, counselingStart);

test('counseling request filter uses Request Status, not Severity', () => {
  assert.match(counseling, /Request Status\s+<select/);
  assert.match(counseling, /value=\{statusFilter\}/);
  assert.match(counseling, /All statuses/);
  assert.doesNotMatch(counseling, /All severities|matchesPriority|priorityFilter/);
});

test('status choices are derived from real counseling request statuses', () => {
  assert.match(counseling, /const requestStatusOptions =/);
  assert.match(counseling, /requestRowsForProgramOptions\.map/);
  assert.match(counseling, /normalizeCounselingRequestStatus\(row\.status\)/);
  assert.match(counseling, /"Pending approval"/);
});

test('program, college, and status filters combine on both lists', () => {
  assert.match(counseling, /matchesCollege &&\s+matchesProgram &&\s+matchesStatus/);
  assert.match(counseling, /const actionableRequestRows =\s+filteredRequestRows\.filter/);
  assert.match(counseling, /\{filteredRequestRows\.length\} total/);
  assert.match(counseling, /\[\.\.\.filteredRequestRows\]/);
});

test('Assessment Cases retains its independent Severity filter', () => {
  assert.match(before, /Filter Assessment Cases[\s\S]*?All severities/);
  assert.match(before, /const matchesPriority =/);
});

test('filtered action queue explains scheduled or completed statuses', () => {
  assert.match(counseling, /No requests with this status need action\. See All Counseling Requests below\./);
});
