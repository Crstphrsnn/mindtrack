import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVacantSlots, weekdayForDate, isStudentVacantAt,
  STUDENT_VACANT_DAYS, STUDENT_VACANT_TIMES
} from '../src/utils/studentAvailability.mjs';

test('five weekdays and eight counseling slots are supported', () => {
  assert.equal(STUDENT_VACANT_DAYS.length, 5);
  assert.equal(STUDENT_VACANT_TIMES.length, 8);
});
test('normalize slots rejects invalid values and deduplicates', () => {
  assert.deepEqual(normalizeVacantSlots([
    { weekday: 1, time_slot: '8:00 AM' },
    { weekday: 1, time_slot: '8:00 AM' },
    { weekday: 6, time_slot: '8:00 AM' },
    { weekday: 2, time_slot: 'midnight' }
  ]), [{ weekday: 1, time_slot: '8:00 AM' }]);
});
test('date matching is stable and rejects invalid calendar dates', () => {
  assert.equal(weekdayForDate('2026-11-02'), 1);
  assert.equal(weekdayForDate('2026-11-03'), 2);
  assert.equal(weekdayForDate('2026-02-30'), null);
});
test('vacant time matches both weekday and exact hourly slot', () => {
  const slots = [{ weekday: 1, time_slot: '9:00 AM' }];
  assert.equal(isStudentVacantAt(slots, '2026-11-02', '9:00 AM'), true);
  assert.equal(isStudentVacantAt(slots, '2026-11-02', '10:00 AM'), false);
  assert.equal(isStudentVacantAt(slots, '2026-11-03', '9:00 AM'), false);
  assert.equal(isStudentVacantAt([], '2026-11-02', '9:00 AM'), false);
});
