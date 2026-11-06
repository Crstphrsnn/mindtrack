import { supabase } from './supabase';

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export const listCaseSessions = consultationId =>
  rpc('mindtrack_list_case_sessions', { p_consultation_id: consultationId });
export const getSessionPrivateNotes = sessionId =>
  rpc('mindtrack_get_session_private_notes', { p_session_id: sessionId });
export const saveSessionPrivateNotes = (sessionId, notes) =>
  rpc('mindtrack_save_session_private_notes', {
    p_session_id: sessionId,
    p_case_history: notes.caseHistory ?? '',
    p_session_summary: notes.sessionSummary ?? '',
    p_observation: notes.observation ?? '',
    p_recommendations: notes.recommendations ?? ''
  });
export const saveSessionRemarks = (sessionId, remarks) =>
  rpc('mindtrack_save_session_remarks', { p_session_id: sessionId, p_remarks: remarks });
export const updateFollowupSession = (sessionId, status, date = null, time = null) =>
  rpc('mindtrack_update_followup_session', {
    p_session_id: sessionId,
    p_status: status,
    p_date: date,
    p_time: time
  });

export const bookFollowupFromSession = (sessionId, date, time) =>
  rpc('mindtrack_book_followup_from_session', {
    p_session_id: sessionId, p_date: date, p_time: time
  });
