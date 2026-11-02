import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const calendarCss = readFileSync(new URL('../src/counseling-calendar.css', import.meta.url), 'utf8');
const home = readFileSync(new URL('../src/components/Home.jsx', import.meta.url), 'utf8');

test('selected counseling dates are excluded from pale hover styles', () => {
  assert.match(calendarCss, /\.counseling-calendar-day:hover:not\(:disabled\):not\(\.selected\)/);
});

test('selected date stays dark with white text when hovered or keyboard-focused', () => {
  assert.match(calendarCss, /\.counseling-calendar-day\.selected:hover:not\(:disabled\)/);
  assert.match(calendarCss, /\.counseling-calendar-day\.selected:focus-visible/);
  assert.match(calendarCss, /\.counseling-calendar-day\.selected,[\s\S]*?background: #173f8f;[\s\S]*?color: #ffffff;/);
});

test('landing page distinguishes student assessment and counseling access', () => {
  assert.match(home, /Psychological Assessment \(Students\)/);
  assert.match(home, /Counseling Requests \(Students\)/);
  assert.match(home, /Students can complete psychological[\s\S]*?screening assessments/);
});

test('landing page assigns referrals to teaching and non-teaching personnel', () => {
  assert.match(home, /Guidance Referrals \(Teaching & Non-teaching\)/);
  assert.match(home, /Teaching and non-teaching personnel can[\s\S]*?submit and track student referrals/);
});

test('outdated statement that all roles can assess and request counseling is removed', () => {
  assert.doesNotMatch(home, /MindTrack provides students, faculty, and personnel with a/);
  assert.match(home, /MindTrack services depend on your account role/);
});
