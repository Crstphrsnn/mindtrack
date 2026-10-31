import React, { useEffect, useState } from "react";
import {
  STUDENT_VACANT_DAYS,
  STUDENT_VACANT_TIMES,
  normalizeVacantSlots
} from "../utils/studentAvailability.mjs";
import {
  getStudentVacantSlots,
  saveMyStudentVacantSlots
} from "../services/studentAvailabilityService";

export default function StudentVacantTime({ studentId }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setLoadError("");
    setMessage("");
    getStudentVacantSlots(studentId)
      .then(data => { if (active) setSlots(data); })
      .catch(err => { if (active) setLoadError(err?.message || "Unable to load vacant times."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId]);

  function toggle(weekday, timeSlot) {
    setSlots(current => {
      const exists = current.some(row => row.weekday === weekday && row.time_slot === timeSlot);
      return normalizeVacantSlots(exists
        ? current.filter(row => !(row.weekday === weekday && row.time_slot === timeSlot))
        : [...current, { weekday, time_slot: timeSlot }]);
    });
    setMessage("");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const saved = await saveMyStudentVacantSlots(slots);
      setSlots(saved);
      setMessage("Vacant times saved. Your counselor can use them when suggesting a reschedule.");
    } catch (err) {
      setError(err?.message || "Unable to save vacant times.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel student-vacant-panel" aria-label="Student vacant time">
      <h2>My Vacant Time</h2>
      <p className="profile-note">
        Select the weekdays and hourly slots when you are normally free for counseling.
        These repeat weekly and help your assigned counselor propose a reschedule.
        They are not booked appointments; confirm the final schedule with your counselor.
      </p>
      {loading ? (
        <p role="status">Loading your vacant times...</p>
      ) : loadError ? (
        <p className="error-box" role="alert">
          Unable to load vacant times: {loadError}. Please refresh after the Student Vacant Time SQL migration is installed.
          Saving is disabled so existing selections cannot be overwritten accidentally.
        </p>
      ) : (
        <>
          <div className="student-vacant-days">
            {STUDENT_VACANT_DAYS.map(day => (
              <details key={day.value} className="student-vacant-day">
                <summary>{day.label} <small>({slots.filter(row => row.weekday === day.value).length} slots)</small></summary>
                <div className="student-vacant-time-grid">
                  {STUDENT_VACANT_TIMES.map(time => (
                    <label key={time} className="student-vacant-choice">
                      <input
                        type="checkbox"
                        checked={slots.some(row => row.weekday === day.value && row.time_slot === time)}
                        onChange={() => toggle(day.value, time)}
                        disabled={saving}
                      />
                      {time}
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <p className="profile-note">Selected: {slots.length} weekly time slots. You can clear all selections and save if your schedule changes.</p>
          <button type="button" className="primary-button" onClick={save} disabled={saving}>
            {saving ? "Saving vacant times..." : "Save Vacant Time"}
          </button>
        </>
      )}
      {message && <p className="success-box" role="status">{message}</p>}
      {error && <p className="error-box" role="alert">{error}</p>}
    </section>
  );
}
