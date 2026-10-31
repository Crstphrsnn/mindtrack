// Student weekly vacant time is advisory, not a confirmed counseling booking.
// Days use ISO-style weekdays: Monday=1 through Friday=5.
export const STUDENT_VACANT_DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" }
];

export const STUDENT_VACANT_TIMES = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
];

export function normalizeVacantSlots(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const slots = [];
  for (const row of rows) {
    const weekday = Number(row?.weekday);
    const timeSlot = String(row?.time_slot ?? row?.timeSlot ?? "").trim();
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 5 ||
        !STUDENT_VACANT_TIMES.includes(timeSlot)) continue;
    const key = `${weekday}|${timeSlot}`;
    if (seen.has(key)) continue;
    seen.add(key);
    slots.push({ weekday, time_slot: timeSlot });
  }
  return slots.sort((a, b) => a.weekday - b.weekday ||
    STUDENT_VACANT_TIMES.indexOf(a.time_slot) - STUDENT_VACANT_TIMES.indexOf(b.time_slot));
}

export function weekdayForDate(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) return null;
  const parsed = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateKey) return null;
  return parsed.getUTCDay();
}

export function isStudentVacantAt(slots, dateKey, timeSlot) {
  const weekday = weekdayForDate(dateKey);
  if (!weekday || weekday > 5) return false;
  return normalizeVacantSlots(slots).some(slot =>
    slot.weekday === weekday && slot.time_slot === timeSlot);
}
