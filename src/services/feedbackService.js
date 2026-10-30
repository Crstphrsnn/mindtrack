import { supabase } from "./supabase";

// Supabase feedback table: id, user_id, category, rating, message,
// created_at, legacy_data. RLS permits owners to insert/read their own
// feedback and Super Admin to read all feedback. No Firestore fallback.
const FEEDBACK_COLUMNS = "id, user_id, category, rating, message, created_at, legacy_data";

function mapFeedback(row) {
  const legacy = row?.legacy_data && typeof row.legacy_data === "object"
    ? row.legacy_data : {};
  return {
    id: String(row.id),
    ownerId: row.user_id || "",
    ownerName: String(legacy.ownerName || legacy.owner_name || ""),
    role: String(legacy.role || ""),
    department: String(legacy.department || ""),
    category: row.category || "Overall Experience",
    rating: Number(row.rating || 0),
    feedback: String(row.message ?? legacy.feedback ?? ""),
    createdAt: row.created_at || null
  };
}

async function currentAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) throw new Error("Your session expired. Please log in again.");
  return data.user.id;
}

export async function listMyMindTrackFeedback(userId) {
  const authId = await currentAuthUser();
  if (String(userId) !== String(authId)) {
    throw new Error("Cannot load another user's feedback history.");
  }
  const { data, error } = await supabase.from("feedback")
    .select(FEEDBACK_COLUMNS)
    .eq("user_id", authId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data || []).map(mapFeedback);
}

export async function submitMindTrackFeedback({ rating, category, feedback }) {
  const stars = Number(rating);
  const cleanCategory = String(category || "Overall Experience").trim();
  const cleanMessage = String(feedback || "").trim();
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error("Choose a rating between 1 and 5 stars.");
  }
  if (!cleanCategory || cleanCategory.length > 100) {
    throw new Error("Select a valid feedback category.");
  }
  if (cleanMessage.length > 1000) {
    throw new Error("Feedback must be 1,000 characters or fewer.");
  }
  const authId = await currentAuthUser();
  const { data, error } = await supabase.from("feedback")
    .insert({ user_id: authId, rating: stars, category: cleanCategory, message: cleanMessage, legacy_data: {} })
    .select(FEEDBACK_COLUMNS)
    .single();
  if (error) throw error;
  if (!data?.id) throw new Error("Supabase did not confirm the feedback submission.");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mindtrack:feedback-changed"));
  }
  return mapFeedback(data);
}

// Called by the Super Admin report only. Database RLS is the real access
// boundary; the role check below is an additional guard against wrong routes.
export async function listAdminMindTrackFeedback() {
  const authId = await currentAuthUser();
  const { data: self, error: selfError } = await supabase.from("profiles")
    .select("role").eq("id", authId).single();
  if (selfError) throw selfError;
  if (self?.role !== "super_admin") {
    throw new Error("Only Super Admin can view system feedback analytics.");
  }

  // Paginate so the total/average isn't silently limited to 1,000 rows.
  const all = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from("feedback")
      .select(FEEDBACK_COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  const userIds = [...new Set(all.map(row => row.user_id).filter(Boolean))];
  const profileById = new Map();
  for (let i = 0; i < userIds.length; i += 100) {
    const { data, error } = await supabase.from("profiles")
      .select("id, name, role, department_id")
      .in("id", userIds.slice(i, i + 100));
    if (error) throw error;
    for (const profile of data || []) profileById.set(profile.id, profile);
  }

  const { data: departments, error: departmentsError } = await supabase
    .from("departments").select("id, name");
  if (departmentsError) throw departmentsError;
  const departmentById = new Map((departments || []).map(row => [row.id, row.name]));

  return all.map(row => {
    const mapped = mapFeedback(row);
    const profile = profileById.get(row.user_id);
    return {
      ...mapped,
      ownerName: profile?.name || mapped.ownerName || "User",
      role: profile?.role || mapped.role || "",
      department: departmentById.get(profile?.department_id) || mapped.department || "—"
    };
  });
}
