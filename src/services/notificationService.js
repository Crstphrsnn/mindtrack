import { supabase } from "./supabase";

// All notification writes go through secure Supabase RPCs.
// Never accept a notification owner ID from the client for clear actions.
function notifyLocalListeners() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mindtrack:notifications-changed"));
  }
}

export async function createNotification(payload) {
  if (!payload?.ownerId) {
    throw new Error("Notification recipient is required.");
  }

  const { data, error } = await supabase.rpc("mindtrack_create_notification", {
    p_owner_id: payload.ownerId,
    p_title: String(payload.title || "MindTrack update"),
    p_message: String(payload.message || "You have a new update."),
    p_notification_type: String(payload.notificationType || "counselor_update"),
    p_source_type: String(payload.sourceType || ""),
    p_source_id: payload.sourceId ? String(payload.sourceId) : "",
    p_target_path: String(payload.targetPath || "/notifications"),
    p_transfer_request_id: payload.transferRequestId
      ? String(payload.transferRequestId)
      : "",
    p_consultation_id: payload.consultationId
      ? String(payload.consultationId)
      : "",
    p_referral_status: payload.referralStatus
      ? String(payload.referralStatus)
      : ""
  });

  if (error) throw error;
  notifyLocalListeners();
  return data;
}

export async function markNotificationRead(notificationId) {
  if (!notificationId) throw new Error("Notification ID is required.");

  const { data, error } = await supabase.rpc("mindtrack_mark_notification_read", {
    p_notification_id: String(notificationId)
  });

  if (error) throw error;
  if (data !== true) {
    throw new Error("Notification was not found or access was denied.");
  }
  notifyLocalListeners();
  return true;
}

export async function markAllNotificationsRead() {
  const { data, error } = await supabase.rpc("mindtrack_mark_all_notifications_read");
  if (error) throw error;
  notifyLocalListeners();
  return Number(data || 0);
}

// Soft-clear: only the current recipient's notification is hidden.
export async function clearNotification(notificationId) {
  if (!notificationId) throw new Error("Notification ID is required.");

  const { data, error } = await supabase.rpc("mindtrack_clear_notification", {
    p_notification_id: String(notificationId)
  });

  if (error) throw error;
  if (data !== true) {
    throw new Error("Notification was already cleared, not found, or access was denied.");
  }
  notifyLocalListeners();
  return true;
}

export async function clearReadNotifications() {
  const { data, error } = await supabase.rpc("mindtrack_clear_read_notifications");
  if (error) throw error;
  notifyLocalListeners();
  return Number(data || 0);
}

export async function clearAllNotifications() {
  const { data, error } = await supabase.rpc("mindtrack_clear_all_notifications");
  if (error) throw error;
  notifyLocalListeners();
  return Number(data || 0);
}
