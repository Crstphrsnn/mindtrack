// Add to src/services/followupSessionService.js
import { supabase } from './supabase';

export async function bookFollowupSession(consultationId, date, time, durationMinutes = 50) {
  if (!consultationId || !date || !time) throw new Error('Select a case, date, and time.');
  const { data, error } = await supabase.rpc('mindtrack_book_followup_session', {
    p_consultation_id: consultationId,
    p_date: date,
    p_time: time,
    p_duration_minutes: durationMinutes,
  });
  if (error) throw error;
  window.dispatchEvent(new Event('mindtrack:counseling-changed'));
  return data;
}
export async function listCaseSessions(consultationId) {
  const { data, error } = await supabase.rpc('mindtrack_list_case_sessions', {
    p_consultation_id: consultationId,
  });
  if (error) throw error;
  return data || [];
}
