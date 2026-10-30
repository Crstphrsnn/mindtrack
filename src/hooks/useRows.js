import {
  useEffect,
  useState
} from "react";

import {
  supabase
} from "../services/supabase";

import { listMindTrackAccounts } from "../services/profileService";


// ======================================================
// ROW COLLECTION HOOK
// ======================================================

export function useRows(
  name,
  filters = {}
) {

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(
    () => {

      let active = true;


      // ================================================
      // DISABLED QUERY
      // ================================================

      if (
        filters.disabled === true
      ) {

        setRows([]);
        setLoading(false);
        setError("");

        return () => {
          active = false;
        };
      }


      // ================================================
      // SUPABASE - ACCOUNTS / COUNSELOR USER PROFILES
      // ================================================
      // The RPC returns all accounts to Super Admin and only currently
      // assigned students to counselors. Never fall back to Firestore.
      if (name === "users") {
        let requestVersion = 0;
        setRows([]);
        setLoading(true);
        setError("");

        async function loadProfiles() {
          const version = ++requestVersion;
          try {
            let incoming = await listMindTrackAccounts();
            if (filters.department) {
              const dept = String(filters.department).trim().toLowerCase();
              incoming = incoming.filter(row =>
                String(row.department || "").trim().toLowerCase() === dept
              );
            }
            if (filters.role) {
              incoming = incoming.filter(row =>
                String(row.role || "").trim().toLowerCase() === String(filters.role).trim().toLowerCase()
              );
            }
            if (filters.ownerId) incoming = incoming.filter(row => row.id === filters.ownerId);
            if (!active || version !== requestVersion) return;
            setRows(incoming);
            setError("");
          } catch (loadError) {
            if (!active || version !== requestVersion) return;
            console.error("Unable to load Supabase accounts:", loadError);
            setRows([]);
            setError(loadError?.message || "Unable to load user profiles from Supabase.");
          } finally {
            if (active && version === requestVersion) setLoading(false);
          }
        }

        function refreshWhenVisible() {
          if (typeof document === "undefined" || document.visibilityState === "visible") {
            void loadProfiles();
          }
        }
        void loadProfiles();
        if (typeof window !== "undefined") {
          window.addEventListener("focus", refreshWhenVisible);
          window.addEventListener("mindtrack:counseling-changed", refreshWhenVisible);
          window.addEventListener("mindtrack:profiles-changed", refreshWhenVisible);
        }
        if (typeof document !== "undefined") {
          document.addEventListener("visibilitychange", refreshWhenVisible);
        }
        return () => {
          active = false;
          requestVersion += 1;
          if (typeof window !== "undefined") {
            window.removeEventListener("focus", refreshWhenVisible);
            window.removeEventListener("mindtrack:counseling-changed", refreshWhenVisible);
            window.removeEventListener("mindtrack:profiles-changed", refreshWhenVisible);
          }
          if (typeof document !== "undefined") {
            document.removeEventListener("visibilitychange", refreshWhenVisible);
          }
        };
      }

      // ================================================
      // SUPABASE - COUNSELOR DIRECTORY
      // ================================================
      //
      // Old MindTrack components may still call:
      //
      // useRows("counselorDirectory")
      //
      // This collection is now loaded from Supabase.
      // ================================================

      if (
        name ===
        "counselorDirectory"
      ) {

        setLoading(true);
        setError("");


        async function loadCounselors() {

          try {

            const {
              data,
              error:
                counselorError
            } =
              await supabase.rpc(
                "get_registration_counselors"
              );


            if (counselorError) {
              throw counselorError;
            }


            let incomingRows =
              (
                Array.isArray(data)
                  ? data
                  : []
              )
                .map(
                  row => ({

                    id:
                      row.counselor_id,

                    counselorId:
                      row.counselor_id,

                    name:
                      String(
                        row.name ||
                        ""
                      ).trim(),

                    department:
                      String(
                        row.department ||
                        ""
                      ).trim(),

                    active:
                      row.active === true
                  })
                )
                .filter(
                  row =>
                    row.id &&
                    row.name &&
                    row.department
                );


            // ------------------------------------------
            // DEPARTMENT FILTER
            // ------------------------------------------

            if (
              filters.department
            ) {

              const targetDepartment =
                String(
                  filters.department
                )
                  .trim()
                  .toLowerCase();


              incomingRows =
                incomingRows.filter(
                  row =>
                    String(
                      row.department ||
                      ""
                    )
                      .trim()
                      .toLowerCase() ===
                    targetDepartment
                );
            }


            // ------------------------------------------
            // COUNSELOR ID FILTER
            // ------------------------------------------

            if (
              filters.counselorId
            ) {

              incomingRows =
                incomingRows.filter(
                  row =>
                    String(
                      row.counselorId ||
                      row.id ||
                      ""
                    ) ===
                    String(
                      filters.counselorId
                    )
                );
            }


            // ------------------------------------------
            // ACTIVE FILTER
            // ------------------------------------------

            if (
              filters.active !==
              undefined
            ) {

              incomingRows =
                incomingRows.filter(
                  row =>
                    row.active ===
                    filters.active
                );
            }


            // ------------------------------------------
            // SORT BY NAME
            // ------------------------------------------

            incomingRows.sort(
              (a, b) =>
                String(
                  a.name ||
                  ""
                ).localeCompare(
                  String(
                    b.name ||
                    ""
                  )
                )
            );


            if (active) {

              setRows(
                incomingRows
              );

              setError("");
              setLoading(false);
            }

          } catch (
            counselorLoadError
          ) {

            console.error(
              "Unable to load Supabase counselor directory:",
              counselorLoadError
            );


            if (active) {

              setRows([]);

              setError(
                counselorLoadError
                  ?.message ||
                "Unable to load the Guidance Counselor directory from Supabase."
              );

              setLoading(false);
            }
          }
        }


        loadCounselors();


        return () => {
          active = false;
        };
      }


      // ================================================
      // SUPABASE - USER MONITORING / HISTORY
      // ================================================
      //
      // Legacy MindTrack pages still call:
      //
      //   useRows("assessmentUserViews", { ownerId })
      //
      // assessmentUserViews is no longer a separate data source.
      // Read the user-safe monitoring fields directly from the
      // Supabase assessments table and map them to the old shape.
      // Detailed answers and instrument scores are intentionally
      // not returned here.
      // ================================================

      if (
        name ===
        "assessmentUserViews"
      ) {

        setLoading(true);
        setError("");


        const ownerId =
          String(
            filters.ownerId ||
            ""
          ).trim();


        if (!ownerId) {

          setRows([]);
          setLoading(false);
          setError("");

          return () => {
            active = false;
          };
        }


        function mapAssessmentRow(
          row
        ) {

          return {

            id:
              row.id,

            assessmentId:
              row.id,

            ownerId:
              row.owner_id ||
              "",

            ownerName:
              row.owner_name ||
              "",

            role:
              row.role ||
              "",

            department:
              row.department ||
              "",

            program:
              row.program ||
              "",

            priority:
              row.priority ||
              "",

            recommendation:
              row.recommendation ||
              "",

            status:
              row.status ||
              "For review",

            counselorRemarks:
              row.counselor_remarks ||
              "",

            reviewed:
              row.reviewed ===
              true,

            reviewedById:
              row.reviewed_by_id ||
              "",

            reviewedByName:
              row.reviewed_by_name ||
              "",

            reviewedByRole:
              row.reviewed_by_role ||
              "",

            createdAt:
              row.created_at ||
              null,

            updatedAt:
              row.updated_at ||
              null

          };
        }


        // Ignore stale requests if multiple Realtime events arrive
        // while an earlier assessment fetch is still in flight.
        let latestMonitoringRequest = 0;

        async function loadAssessmentUserViews() {
          const requestId = ++latestMonitoringRequest;

          try {

            const {
              data,
              error:
                assessmentError
            } =
              await supabase
                .from(
                  "assessments"
                )
                .select(
                  `
                    id,
                    owner_id,
                    owner_name,
                    role,
                    department,
                    program,
                    priority,
                    recommendation,
                    status,
                    counselor_remarks,
                    reviewed,
                    reviewed_by_id,
                    reviewed_by_name,
                    reviewed_by_role,
                    created_at,
                    updated_at
                  `
                )
                .eq(
                  "owner_id",
                  ownerId
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false
                  }
                );


            if (
              assessmentError
            ) {

              throw assessmentError;
            }


            if (!active || requestId !== latestMonitoringRequest) {
              return;
            }


            setRows(
              (
                Array.isArray(data)
                  ? data
                  : []
              ).map(
                mapAssessmentRow
              )
            );

            setError("");
            setLoading(false);


          } catch (
            assessmentError
          ) {

            console.error(
              "Unable to load Supabase monitoring/history assessments:",
              assessmentError
            );


            if (active && requestId === latestMonitoringRequest) {

              setRows([]);

              setError(
                assessmentError
                  ?.message ||
                "Unable to load your assessment monitoring history."
              );

              setLoading(false);
            }
          }
        }


        // The first read is a normal, RLS-protected SELECT.
        // Realtime only sends a minimal event (no scores/answers).
        loadAssessmentUserViews();

        function refreshMonitoring() {
          if (active) {
            loadAssessmentUserViews();
          }
        }

        // INSERT events are published from assessment_status_events
        // by the trigger on public.assessments. Do NOT subscribe to
        // the sensitive assessments table itself.
        const channel = supabase
          .channel(`assessment-status-events-${ownerId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "assessment_status_events",
              filter: `owner_id=eq.${ownerId}`
            },
            refreshMonitoring
          )
          .subscribe((status) => {
            if (!active) return;

            if (status === "SUBSCRIBED") {
              // Covers a status change between initial fetch and
              // successful Realtime subscription.
              refreshMonitoring();
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT"
            ) {
              console.warn(
                "Monitoring Realtime connection is unavailable; " +
                "latest data will still load when the page regains focus."
              );
            }
          });

        // Keep the page in sync after local saves and when a browser
        // resumes from a sleeping or disconnected tab.
        function refreshOnVisibility() {
          if (
            typeof document !== "undefined" &&
            document.visibilityState === "visible"
          ) {
            refreshMonitoring();
          }
        }

        if (typeof window !== "undefined") {
          window.addEventListener(
            "mindtrack:assessments-changed",
            refreshMonitoring
          );
          window.addEventListener("focus", refreshMonitoring);
        }

        if (typeof document !== "undefined") {
          document.addEventListener(
            "visibilitychange",
            refreshOnVisibility
          );
        }

        return () => {
          active = false;
          void supabase.removeChannel(channel);

          if (typeof window !== "undefined") {
            window.removeEventListener(
              "mindtrack:assessments-changed",
              refreshMonitoring
            );
            window.removeEventListener("focus", refreshMonitoring);
          }

          if (typeof document !== "undefined") {
            document.removeEventListener(
              "visibilitychange",
              refreshOnVisibility
            );
          }
        };
      }


      // ================================================
      // SUPABASE - ASSESSMENT CASES
      // ================================================
      //
      // Counselor / Super Admin case management uses a
      // server-authorized RPC. This keeps confidential answers
      // and instrument results behind database-side role and
      // assignment checks instead of relying on client filters.
      // ================================================

      if (
        name ===
        "assessments"
      ) {

        setLoading(true);
        setError("");


        function mapAssessmentCaseRow(
          row
        ) {

          return {

            id:
              row.id,

            ownerId:
              row.owner_id ||
              "",

            ownerName:
              row.owner_name ||
              "",

            role:
              row.role ||
              "",

            departmentId:
              row.department_id ||
              "",

            department:
              row.department ||
              "",

            program:
              row.program ||
              "",

            assessmentVersion:
              row.assessment_version ||
              "",

            instrumentTitles:
              Array.isArray(
                row.instrument_titles
              )
                ? row.instrument_titles
                : [],

            answers:
              row.answers &&
              typeof row.answers ===
                "object"
                ? row.answers
                : {},

            phq9Difficulty:
              row.phq9_difficulty ||
              "",

            notes:
              row.notes ||
              "",

            score:
              Number(
                row.score ||
                0
              ),

            priority:
              row.priority ||
              "",

            recommendation:
              row.recommendation ||
              "",

            safetyFlag:
              row.safety_flag ===
              true,

            instrumentResults:
              row.instrument_results &&
              typeof row.instrument_results ===
                "object"
                ? row.instrument_results
                : {},

            status:
              row.status ||
              "For review",

            counselorRemarks:
              row.counselor_remarks ||
              "",

            reviewed:
              row.reviewed ===
              true,

            reviewedById:
              row.reviewed_by_id ||
              "",

            reviewedByName:
              row.reviewed_by_name ||
              "",

            reviewedByRole:
              row.reviewed_by_role ||
              "",

            rawPayload:
              row.raw_payload &&
              typeof row.raw_payload ===
                "object"
                ? row.raw_payload
                : {},

            createdAt:
              row.created_at ||
              null,

            updatedAt:
              row.updated_at ||
              null

          };
        }


        function applyAssessmentFilters(
          incomingRows
        ) {

          let filteredRows =
            [...incomingRows];


          if (
            filters.ownerId
          ) {

            filteredRows =
              filteredRows.filter(
                row =>
                  String(
                    row.ownerId ||
                    ""
                  ) ===
                  String(
                    filters.ownerId
                  )
              );
          }


          if (
            filters.department
          ) {

            const targetDepartment =
              String(
                filters.department
              )
                .trim()
                .toLowerCase();


            filteredRows =
              filteredRows.filter(
                row =>
                  String(
                    row.department ||
                    ""
                  )
                    .trim()
                    .toLowerCase() ===
                  targetDepartment
              );
          }


          if (
            filters.role
          ) {

            filteredRows =
              filteredRows.filter(
                row =>
                  String(
                    row.role ||
                    ""
                  ) ===
                  String(
                    filters.role
                  )
              );
          }


          if (
            filters.status
          ) {

            filteredRows =
              filteredRows.filter(
                row =>
                  String(
                    row.status ||
                    ""
                  ) ===
                  String(
                    filters.status
                  )
              );
          }


          filteredRows.sort(
            (a, b) => {

              const aTime =
                new Date(
                  a.createdAt ||
                  0
                ).getTime();

              const bTime =
                new Date(
                  b.createdAt ||
                  0
                ).getTime();


              return (
                (Number.isNaN(bTime)
                  ? 0
                  : bTime) -
                (Number.isNaN(aTime)
                  ? 0
                  : aTime)
              );
            }
          );


          return filteredRows;
        }


        async function loadAssessmentCases() {

          try {

            const {
              data,
              error:
                caseError
            } =
              await supabase.rpc(
                "get_assessment_cases"
              );


            if (caseError) {
              throw caseError;
            }


            if (!active) {
              return;
            }


            const incomingRows =
              (
                Array.isArray(data)
                  ? data
                  : []
              ).map(
                mapAssessmentCaseRow
              );


            setRows(
              applyAssessmentFilters(
                incomingRows
              )
            );

            setError("");
            setLoading(false);


          } catch (
            caseError
          ) {

            console.error(
              "Unable to load Supabase assessment cases:",
              caseError
            );


            if (active) {

              setRows([]);

              setError(
                caseError
                  ?.message ||
                "Unable to load assessment cases from Supabase."
              );

              setLoading(false);
            }
          }
        }


        function refreshAssessmentCases() {

          if (active) {
            loadAssessmentCases();
          }
        }


        loadAssessmentCases();


        if (
          typeof window !==
          "undefined"
        ) {

          window.addEventListener(
            "mindtrack:assessments-changed",
            refreshAssessmentCases
          );
        }


        return () => {

          active = false;


          if (
            typeof window !==
            "undefined"
          ) {

            window.removeEventListener(
              "mindtrack:assessments-changed",
              refreshAssessmentCases
            );
          }
        };
      }


      // ================================================
      // SUPABASE - COUNSELING AND APPOINTMENTS (PHASE 1)
      // ================================================
      if (
        name === "consultations" ||
        name === "counselingScheduleSlots" ||
        name === "counselorAssignments" ||
        name === "transferRequests" ||
        name === "transferableUsers"
      ) {
        let requestVersion = 0;
        setRows([]);
        setLoading(true);
        setError("");

        async function loadCounselingRows() {
          const currentRequest = ++requestVersion;
          try {
            let incoming = [];
            if (name === "consultations") {
              const { data, error: loadError } = await supabase.rpc(
                "mindtrack_list_consultations"
              );
              if (loadError) throw loadError;
              incoming = Array.isArray(data) ? data : [];
              if (filters.ownerId) {
                incoming = incoming.filter(row => row.ownerId === filters.ownerId);
              }
              if (filters.assignedCounselorId) {
                incoming = incoming.filter(row =>
                  row.assignedCounselorId === filters.assignedCounselorId
                );
              }
              if (filters.department) {
                incoming = incoming.filter(row =>
                  String(row.department || "").trim().toLowerCase() ===
                  String(filters.department).trim().toLowerCase()
                );
              }
              if (filters.status) {
                incoming = incoming.filter(row => row.status === filters.status);
              }
            } else if (name === "counselingScheduleSlots") {
              const counselorId = String(filters.counselorId || "");
              if (counselorId && counselorId !== "__NO_ASSIGNED_COUNSELOR__") {
                const { data, error: loadError } = await supabase.rpc(
                  "mindtrack_list_counseling_slots",
                  { p_counselor_id: counselorId }
                );
                if (loadError) throw loadError;
                incoming = Array.isArray(data) ? data : [];
              }
            } else if (name === "counselorAssignments") {
              const { data, error: loadError } = await supabase.rpc(
                "mindtrack_get_my_counselor"
              );
              if (loadError) throw loadError;
              incoming = data ? [{
                id: data.counselorId,
                assignedCounselorId: data.counselorId,
                assignedCounselorName: data.counselorName || "",
                assignedCounselorDepartment: data.department || ""
              }] : [];
            } else if (name === "transferRequests") {
              const { data, error: loadError } = await supabase.rpc("mindtrack_list_transfer_requests");
              if (loadError) throw loadError;
              incoming = Array.isArray(data) ? data : [];
              if (filters.requestedById) incoming = incoming.filter(row => row.requestedById === filters.requestedById);
              if (filters.targetCounselorId) incoming = incoming.filter(row => row.targetCounselorId === filters.targetCounselorId);
              if (filters.ownerId) incoming = incoming.filter(row => row.ownerId === filters.ownerId);
              if (filters.status) incoming = incoming.filter(row => row.status === filters.status);
            } else if (name === "transferableUsers") {
              const { data, error: loadError } = await supabase.rpc("mindtrack_list_transferable_users");
              if (loadError) throw loadError;
              incoming = Array.isArray(data) ? data : [];
            }
            if (!active || currentRequest !== requestVersion) return;
            setRows(incoming);
            setError("");
          } catch (loadError) {
            if (!active || currentRequest !== requestVersion) return;
            console.error(`Unable to load Supabase ${name}:`, loadError);
            setRows([]);
            setError(loadError?.message || `Unable to load ${name}.`);
          } finally {
            if (active && currentRequest === requestVersion) setLoading(false);
          }
        }

        function refreshCounseling() {
          if (active) void loadCounselingRows();
        }
        refreshCounseling();
        const tableName = name === "consultations" ? "consultations"
          : name === "counselingScheduleSlots" ? "counseling_schedule_slots"
          : name === "transferRequests" ? "transfer_requests" : "counselor_assignments";
        const channel = supabase
          .channel(`mindtrack-${tableName}-${Math.random().toString(36).slice(2)}`)
          .on("postgres_changes", {
            event: "*", schema: "public", table: tableName
          }, refreshCounseling)
          .subscribe();
        function refreshWhenVisible() {
          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            refreshCounseling();
          }
        }
        if (typeof window !== "undefined") {
          window.addEventListener("mindtrack:counseling-changed", refreshCounseling);
          window.addEventListener("focus", refreshCounseling);
        }
        if (typeof document !== "undefined") {
          document.addEventListener("visibilitychange", refreshWhenVisible);
        }
        return () => {
          active = false;
          requestVersion += 1;
          void supabase.removeChannel(channel);
          if (typeof window !== "undefined") {
            window.removeEventListener("mindtrack:counseling-changed", refreshCounseling);
            window.removeEventListener("focus", refreshCounseling);
          }
          if (typeof document !== "undefined") {
            document.removeEventListener("visibilitychange", refreshWhenVisible);
          }
        };
      }

      // ================================================
      // SUPABASE - REFERRALS (PHASE 3)
      // ================================================
      // No Firestore fallback for referrals. Server-side RPC enforces access.

      if (name === "referrals") {
        let requestVersion = 0;
        setRows([]);
        setLoading(true);
        setError("");

        async function loadReferrals() {
          const currentRequest = ++requestVersion;
          try {
            const { data, error: loadError } = await supabase.rpc("mindtrack_list_referrals");
            if (loadError) throw loadError;
            let incoming = Array.isArray(data) ? data : [];
            if (filters.ownerId) incoming = incoming.filter(row => row.ownerId === filters.ownerId);
            if (filters.assignedCounselorId) incoming = incoming.filter(row =>
              row.assignedCounselorId === filters.assignedCounselorId
            );
            if (filters.department) incoming = incoming.filter(row =>
              String(row.department || "").trim().toLowerCase() ===
              String(filters.department).trim().toLowerCase()
            );
            if (filters.status) incoming = incoming.filter(row => row.status === filters.status);
            if (!active || currentRequest !== requestVersion) return;
            setRows(incoming);
            setError("");
          } catch (loadError) {
            if (!active || currentRequest !== requestVersion) return;
            console.error("Unable to load Supabase referrals:", loadError);
            setRows([]);
            setError(loadError?.message || "Unable to load referrals.");
          } finally {
            if (active && currentRequest === requestVersion) setLoading(false);
          }
        }

        function refreshReferrals() {
          if (active) void loadReferrals();
        }
        refreshReferrals();
        const channel = supabase
          .channel(`mindtrack-referrals-${Math.random().toString(36).slice(2)}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "referrals" }, refreshReferrals)
          .subscribe();
        function refreshWhenVisible() {
          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            refreshReferrals();
          }
        }
        const polling = setInterval(refreshReferrals, 30000); // Fallback if Realtime is unavailable.
        if (typeof window !== "undefined") {
          window.addEventListener("mindtrack:referrals-changed", refreshReferrals);
          window.addEventListener("focus", refreshReferrals);
        }
        if (typeof document !== "undefined") {
          document.addEventListener("visibilitychange", refreshWhenVisible);
        }
        return () => {
          active = false;
          requestVersion += 1;
          clearInterval(polling);
          void supabase.removeChannel(channel);
          if (typeof window !== "undefined") {
            window.removeEventListener("mindtrack:referrals-changed", refreshReferrals);
            window.removeEventListener("focus", refreshReferrals);
          }
          if (typeof document !== "undefined") {
            document.removeEventListener("visibilitychange", refreshWhenVisible);
          }
        };
      }

      // ================================================
      // SUPABASE - USER NOTIFICATIONS (REALTIME)
      // ================================================
      // The owner filter is enforced by Supabase RLS as well
      // as the client query. Never subscribe to another user.

      if (name === "notifications") {
        const ownerId = filters.ownerId;
        let requestVersion = 0;

        if (!ownerId) {
          setRows([]);
          setLoading(false);
          setError("");
          return () => { active = false; };
        }

        setRows([]);
        setLoading(true);
        setError("");

        async function loadNotifications() {
          const currentRequest = ++requestVersion;

          try {
            const { data, error: loadError } = await supabase
              .from("notifications")
              .select(`
                id, owner_id, title, message, notification_type,
                sender_role, sender_id, sender_name, target_path,
                source_type, source_id, transfer_request_id,
                consultation_id, referral_status, read, created_at
              `)
              .eq("owner_id", ownerId)
              // Cleared notifications remain in the DB but are hidden from the UI.
              .is("cleared_at", null)
              .order("created_at", { ascending: false })
              .limit(250);

            if (loadError) throw loadError;
            if (!active || currentRequest !== requestVersion) return;

            setRows((data || []).map((item) => ({
              id: String(item.id),
              ownerId: item.owner_id,
              title: item.title || "MindTrack update",
              message: item.message || "You have a new update.",
              notificationType: item.notification_type || "",
              senderRole: item.sender_role || "",
              senderId: item.sender_id || "",
              senderName: item.sender_name || "",
              targetPath: item.target_path || "",
              sourceType: item.source_type || "",
              sourceId: item.source_id || "",
              transferRequestId: item.transfer_request_id || "",
              consultationId: item.consultation_id || "",
              referralStatus: item.referral_status || "",
              read: item.read === true,
              createdAt: item.created_at || null
            })));
            setError("");
          } catch (loadError) {
            if (!active || currentRequest !== requestVersion) return;
            console.error("Unable to load Supabase notifications:", loadError);
            setRows([]);
            setError(loadError?.message || "Unable to load notifications.");
          } finally {
            if (active && currentRequest === requestVersion) {
              setLoading(false);
            }
          }
        }

        function refreshNotifications() {
          if (active) void loadNotifications();
        }

        // Fetch immediately, then again once Realtime is connected.
        refreshNotifications();

        const channel = supabase
          .channel(`mindtrack-notifications-${ownerId}-${Math.random().toString(36).slice(2)}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `owner_id=eq.${ownerId}`
            },
            refreshNotifications
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") refreshNotifications();
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              console.warn("Notification Realtime unavailable; focus will refresh the list.");
            }
          });

        function refreshWhenVisible() {
          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            refreshNotifications();
          }
        }

        const polling = setInterval(refreshNotifications, 30000);

        if (typeof window !== "undefined") {
          window.addEventListener("mindtrack:notifications-changed", refreshNotifications);
          window.addEventListener("focus", refreshNotifications);
        }
        if (typeof document !== "undefined") {
          document.addEventListener("visibilitychange", refreshWhenVisible);
        }

        return () => {
          active = false;
          requestVersion += 1;
          clearInterval(polling);
          void supabase.removeChannel(channel);
          if (typeof window !== "undefined") {
            window.removeEventListener("mindtrack:notifications-changed", refreshNotifications);
            window.removeEventListener("focus", refreshNotifications);
          }
          if (typeof document !== "undefined") {
            document.removeEventListener("visibilitychange", refreshWhenVisible);
          }
        };
      }


      // All supported live collections above use Supabase. Fail closed for
      // unknown names instead of reading a demo/local/Firebase database.
      console.error(`Unsupported MindTrack Supabase collection: ${name}`);
      setRows([]);
      setLoading(false);
      setError(`Unsupported data collection: ${name}. Contact the system administrator.`);
      return () => { active = false; };

    },

    [
      name,

      filters.disabled,

      filters.ownerId,

      filters.department,

      filters.role,

      filters.status,

      filters.requestedById,

      filters.targetCounselorId,

      filters.assignedCounselorId,

      filters.counselorId,

      filters.active
    ]
  );


  // ====================================================
  // ARRAY RESULT
  // ====================================================

  const result =
    [...rows];


  result.loading =
    loading;

  result.error =
    error;


  return result;
}


// ======================================================
// SINGLE DOCUMENT HOOK
// ======================================================

export function useDocumentRow(
  name,
  documentId
) {

  const [row, setRow] =
    useState(null);

  const [loading, setLoading] =
    useState(
      Boolean(documentId)
    );

  const [error, setError] =
    useState("");


  useEffect(
    () => {

      let active = true;


      // ================================================
      // NO DOCUMENT
      // ================================================

      if (!documentId) {

        setRow(null);
        setLoading(false);
        setError("");

        return () => {
          active = false;
        };
      }


      // ================================================
      // SUPABASE - ASSESSMENT LOCK
      // ================================================

      if (
        name ===
        "assessmentLocks"
      ) {

        setLoading(true);
        setError("");


        async function loadAssessmentLock() {

          try {

            const {
              data,
              error:
                assessmentLockError
            } =
              await supabase
                .from(
                  "assessment_locks"
                )
                .select(`
                  owner_id,
                  latest_assessment_id,
                  status,
                  concluded_at,
                  early_reassessment_allowed,
                  created_at,
                  updated_at
                `)
                .eq(
                  "owner_id",
                  documentId
                )
                .maybeSingle();


            if (
              assessmentLockError
            ) {

              throw assessmentLockError;
            }


            if (!active) {
              return;
            }


            if (!data) {

              setRow(null);
              setError("");
              setLoading(false);

              return;
            }


            setRow({

              id:
                data.owner_id,

              ownerId:
                data.owner_id,

              latestAssessmentId:
                data.latest_assessment_id ||
                "",

              status:
                data.status ||
                "Eligible",

              concludedAt:
                data.concluded_at ||
                null,

              earlyReassessmentAllowed:
                data.early_reassessment_allowed ===
                true,

              createdAt:
                data.created_at,

              updatedAt:
                data.updated_at
            });


            setError("");
            setLoading(false);

          } catch (
            assessmentLockError
          ) {

            console.error(
              "Unable to load Supabase assessment lock:",
              assessmentLockError
            );


            if (active) {

              setRow(null);

              setError(
                assessmentLockError
                  ?.message ||
                "Unable to check assessment availability."
              );

              setLoading(false);
            }
          }
        }


        loadAssessmentLock();


        return () => {
          active = false;
        };
      }


      // The only active single-document subscription is assessmentLocks.
      // Unknown documents must not fall back to Firebase or local storage.
      console.error(`Unsupported MindTrack Supabase document: ${name}/${documentId}`);
      setRow(null);
      setLoading(false);
      setError(`Unsupported data document: ${name}. Contact the system administrator.`);
      return () => { active = false; };

    },

    [
      name,
      documentId
    ]
  );


  const result =
    row
      ? [row]
      : [];


  result.loading =
    loading;

  result.error =
    error;


  return result;
}


// ======================================================
// ROW LOADING HELPER
// ======================================================

export function rowsAreLoading(
  ...sources
) {

  return sources.some(
    source =>
      Boolean(
        source?.loading
      )
  );
}


// ======================================================
// FIRST ERROR HELPER
// ======================================================

export function firstRowsError(
  ...sources
) {

  return (
    sources
      .map(
        source =>
          source?.error ||
          ""
      )
      .find(
        Boolean
      ) ||
    ""
  );
}