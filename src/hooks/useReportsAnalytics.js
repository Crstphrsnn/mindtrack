import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

// Reports are aggregated inside a server-authorized RPC. No assessment
// answers, counseling messages, profile contact data, or referral identities
// are sent to the reporting page.
const EMPTY_REPORT = Object.freeze({
  assessmentTotal: 0,
  counselingTotal: 0,
  scheduledTotal: 0,
  referralTotal: 0,
  assessmentBreakdown: [],
  counselingBreakdown: [],
  referralBreakdown: []
});

function positiveInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

export function normalizeMindTrackReport(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Unexpected reports response from Supabase.");
  }
  const normalized = {
    assessmentTotal: positiveInteger(raw.assessmentTotal),
    counselingTotal: positiveInteger(raw.counselingTotal),
    scheduledTotal: positiveInteger(raw.scheduledTotal),
    referralTotal: positiveInteger(raw.referralTotal)
  };
  for (const field of ["assessmentBreakdown", "counselingBreakdown", "referralBreakdown"]) {
    if (!Array.isArray(raw[field])) {
      throw new Error(`Missing ${field} in Supabase reports response.`);
    }
    normalized[field] = raw[field].filter(row => row && typeof row === "object").map(row => ({
      dimension: String(row.dimension || ""),
      label: String(row.label || "Not specified"),
      ...(field === "assessmentBreakdown" ? {
        priority: String(row.priority || "Unclassified"),
        count: positiveInteger(row.count)
      } : field === "counselingBreakdown" ? {
        requests: positiveInteger(row.requests),
        scheduledSessions: positiveInteger(row.scheduledSessions)
      } : {
        count: positiveInteger(row.count)
      })
    }));
  }
  return normalized;
}

export function useReportsAnalytics() {
  const [report, setReport] = useState(EMPTY_REPORT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let requestVersion = 0;
    async function refresh() {
      const version = ++requestVersion;
      try {
        const { data, error: rpcError } = await supabase.rpc("mindtrack_get_reports_analytics");
        if (rpcError) throw rpcError;
        const next = normalizeMindTrackReport(data);
        if (!active || version !== requestVersion) return;
        setReport(next);
        setError("");
      } catch (loadError) {
        if (!active || version !== requestVersion) return;
        console.error("Unable to load MindTrack reports analytics:", loadError);
        setError(loadError?.message || "Unable to load reports from Supabase.");
      } finally {
        if (active && version === requestVersion) setLoading(false);
      }
    }

    function refreshOnFocus() {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        void refresh();
      }
    }

    void refresh();
    // A polling fallback avoids subscribing to raw confidential assessment data.
    const polling = setInterval(refreshOnFocus, 30000);
    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("mindtrack:assessments-changed", refreshOnFocus);
    window.addEventListener("mindtrack:counseling-changed", refreshOnFocus);
    window.addEventListener("mindtrack:referrals-changed", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      active = false;
      requestVersion += 1;
      clearInterval(polling);
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("mindtrack:assessments-changed", refreshOnFocus);
      window.removeEventListener("mindtrack:counseling-changed", refreshOnFocus);
      window.removeEventListener("mindtrack:referrals-changed", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, []);

  return { report, loading, error };
}
