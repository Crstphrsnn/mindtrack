import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadAssessmentProgress,
  saveAssessmentProgress,
  deleteAssessmentProgress,
} from "../services/assessmentDraftService";

const DRAFT_VERSION = "WHO5-PHQ9-GAD7-DASS21-SUBSCALES-2026-09";
const CACHE_PREFIX = "mindtrack:assessment-progress:v1:";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const AUTOSAVE_DELAY_MS = 400;

function emptyDraft() {
  return {
    version: DRAFT_VERSION,
    answers: {},
    phq9Difficulty: "",
    notes: "",
    pageIndex: 0,
    updatedAt: "",
  };
}

function normalizeDraft(value) {
  if (!value || typeof value !== "object" || value.version !== DRAFT_VERSION) {
    return emptyDraft();
  }

  const answers = value.answers && typeof value.answers === "object" &&
    !Array.isArray(value.answers) ? value.answers : {};
  const rawIndex = Number(value.pageIndex);

  return {
    version: DRAFT_VERSION,
    answers,
    phq9Difficulty: typeof value.phq9Difficulty === "string"
      ? value.phq9Difficulty : "",
    notes: typeof value.notes === "string" ? value.notes : "",
    pageIndex: Number.isInteger(rawIndex)
      ? Math.max(0, Math.min(4, rawIndex)) : 0,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
  };
}

function cacheKey(studentId) {
  return `${CACHE_PREFIX}${studentId}`;
}

function readCache(studentId) {
  if (!studentId || typeof sessionStorage === "undefined") return null;
  try {
    const text = sessionStorage.getItem(cacheKey(studentId));
    if (!text) return null;
    const value = JSON.parse(text);
    const stamp = Date.parse(value?.updatedAt);
    if (!Number.isFinite(stamp) || Date.now() - stamp > CACHE_MAX_AGE_MS) {
      sessionStorage.removeItem(cacheKey(studentId));
      return null;
    }
    if (value.version !== DRAFT_VERSION) return null;
    return normalizeDraft(value);
  } catch {
    return null;
  }
}

function writeCache(studentId, draft) {
  if (!studentId || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(cacheKey(studentId), JSON.stringify(draft));
  } catch {
    // Browsers can disable session storage; Supabase remains primary.
  }
}

function removeCache(studentId) {
  if (!studentId || typeof sessionStorage === "undefined") return;
  try { sessionStorage.removeItem(cacheKey(studentId)); } catch { /* ignored */ }
}

function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

// Autosave is per student. It survives React route changes, reloads, and
// browser restarts via Supabase; sessionStorage covers rapid same-tab reloads.
export function useAssessmentDraft(studentId) {
  const [draft, setDraft] = useState(() => readCache(studentId) || emptyDraft());
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftSyncStatus, setDraftSyncStatus] = useState("loading");
  const [draftError, setDraftError] = useState("");

  const draftRef = useRef(draft);
  const readyRef = useRef(false);
  const dirtyRef = useRef(false);
  const timerRef = useRef(null);
  const queueRef = useRef(Promise.resolve());
  const mountedRef = useRef(false);

  const persist = useCallback((snapshot) => {
    if (!studentId) return Promise.resolve();
    // Serialize writes: a slower old request must never overwrite a newer one.
    const job = queueRef.current.catch(() => {}).then(() =>
      saveAssessmentProgress(studentId, snapshot)
    );
    queueRef.current = job;
    job.then(() => {
      if (draftRef.current.updatedAt === snapshot.updatedAt) {
        dirtyRef.current = false;
        if (mountedRef.current) {
          setDraftSyncStatus("saved");
          setDraftError("");
        }
      }
    }).catch((error) => {
      if (mountedRef.current) {
        setDraftSyncStatus("error");
        setDraftError(error?.message || "Cloud draft save failed.");
      }
    });
    return job;
  }, [studentId]);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    readyRef.current = false;
    dirtyRef.current = false;
    setDraftLoading(true);
    setDraftSyncStatus("loading");
    setDraftError("");

    const local = readCache(studentId);
    draftRef.current = local || emptyDraft();
    setDraft(draftRef.current);

    (async () => {
      try {
        const remote = await loadAssessmentProgress(studentId);
        if (!active) return;
        const server = remote?.version === DRAFT_VERSION
          ? normalizeDraft(remote) : null;
        const useLocal = Boolean(local) &&
          (!server || timestamp(local.updatedAt) > timestamp(server.updatedAt));
        const restored = useLocal ? local : (server || local || emptyDraft());
        draftRef.current = restored;
        setDraft(restored);
        writeCache(studentId, restored);
        readyRef.current = true;
        setDraftLoading(false);
        setDraftSyncStatus("saved");

        // A fast reload can occur before the previous cloud save completes.
        // Sync the newer same-tab copy back to Supabase.
        if (useLocal) {
          dirtyRef.current = true;
          setDraftSyncStatus("saving");
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            void persist(draftRef.current).catch(() => {});
          }, AUTOSAVE_DELAY_MS);
        }
      } catch (error) {
        if (!active) return;
        // Keep the local backup available during a temporary network error.
        readyRef.current = true;
        setDraftLoading(false);
        setDraftSyncStatus("error");
        setDraftError(error?.message || "Could not restore cloud draft.");
      }
    })();

    const syncWhenOnline = () => {
      if (readyRef.current && dirtyRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        void persist(draftRef.current).catch(() => {});
      }
    };
    window.addEventListener("online", syncWhenOnline);

    return () => {
      active = false;
      mountedRef.current = false;
      window.removeEventListener("online", syncWhenOnline);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      // Leaving Assessment for Monitoring or Counseling should flush the
      // latest answers immediately instead of discarding a debounce timer.
      if (readyRef.current && dirtyRef.current) {
        void persist(draftRef.current).catch(() => {});
      }
      readyRef.current = false;
    };
  }, [studentId, persist]);

  const updateDraft = useCallback((changes) => {
    if (!readyRef.current) return;
    const previous = draftRef.current;
    const nextTime = Math.max(Date.now(), timestamp(previous.updatedAt) + 1);
    const next = {
      ...previous,
      ...changes,
      version: DRAFT_VERSION,
      updatedAt: new Date(nextTime).toISOString(),
    };
    draftRef.current = next;
    setDraft(next);
    writeCache(studentId, next); // Synchronous refresh protection.
    dirtyRef.current = true;
    setDraftSyncStatus("saving");
    setDraftError("");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void persist(draftRef.current).catch(() => {});
    }, AUTOSAVE_DELAY_MS);
  }, [studentId, persist]);

  const setAnswers = useCallback((value) => {
    const next = typeof value === "function"
      ? value(draftRef.current.answers) : value;
    updateDraft({ answers: next });
  }, [updateDraft]);
  const setPhq9Difficulty = useCallback((value) => {
    updateDraft({ phq9Difficulty: typeof value === "function"
      ? value(draftRef.current.phq9Difficulty) : value });
  }, [updateDraft]);
  const setNotes = useCallback((value) => {
    updateDraft({ notes: typeof value === "function"
      ? value(draftRef.current.notes) : value });
  }, [updateDraft]);
  const setAssessmentPageIndex = useCallback((value) => {
    updateDraft({ pageIndex: typeof value === "function"
      ? value(draftRef.current.pageIndex) : value });
  }, [updateDraft]);

  const flushDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (readyRef.current && dirtyRef.current) {
      return persist(draftRef.current);
    }
    return queueRef.current;
  }, [persist]);

  const clearDraft = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    dirtyRef.current = false;
    // An in-flight autosave must finish before the final delete.
    await queueRef.current.catch(() => {});
    removeCache(studentId);
    draftRef.current = emptyDraft();
    setDraft(draftRef.current);
    await deleteAssessmentProgress(studentId);
    if (mountedRef.current) {
      setDraftSyncStatus("saved");
      setDraftError("");
    }
  }, [studentId]);

  return {
    answers: draft.answers,
    setAnswers,
    phq9Difficulty: draft.phq9Difficulty,
    setPhq9Difficulty,
    notes: draft.notes,
    setNotes,
    assessmentPageIndex: draft.pageIndex,
    setAssessmentPageIndex,
    draftLoading,
    draftSyncStatus,
    draftError,
    flushDraft,
    clearDraft,
  };
}
