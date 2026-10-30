import { supabase } from "./supabase";

const PSGC_API = "https://psgc.cloud/api/v2";

export async function fetchPsgcItems(path) {
  const response = await fetch(`${PSGC_API}${path}`);

  if (!response.ok) {
    throw new Error("Unable to load Philippine address data.");
  }

  const result = await response.json();

  return Array.isArray(result)
    ? result
    : Array.isArray(result?.data)
      ? result.data
      : [];
}

export async function getRegistrationCounselors() {
  const { data, error } = await supabase.rpc(
    "get_registration_counselors"
  );

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data : [])
    .map(row => ({
      id: row.counselor_id,
      counselorId: row.counselor_id,
      name: row.name || "",
      department: row.department || "",
      active: row.active === true
    }))
    .filter(row =>
      row.id &&
      row.name &&
      row.department &&
      row.active
    )
    .sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
}
