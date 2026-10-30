import { useEffect, useState } from "react";
import { getRegistrationCounselors } from "../services/registrationService";

export default function useRegistrationCounselors() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCounselors() {
      try {
        setLoading(true);
        setError("");

        const counselors = await getRegistrationCounselors();

        if (active) {
          setRows(counselors);
        }
      } catch (loadError) {
        console.error(
          "Unable to load Supabase counselor directory:",
          loadError
        );

        if (active) {
          setRows([]);
          setError(
            loadError?.message ||
            "Unable to load the Guidance Counselor directory."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCounselors();

    return () => {
      active = false;
    };
  }, []);

  const result = [...rows];
  result.loading = loading;
  result.error = error;

  return result;
}
