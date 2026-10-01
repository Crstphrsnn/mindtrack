import React, { useEffect, useMemo, useRef, useState } from "react";
import psuLogo from "./assets/psu-logo.jpg";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";

import {
  db
} from "./services/firebase";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MessageCircle,
  Shield,
  Star,
  User,
  UserPlus
} from "lucide-react";

import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Home from "./components/Home";
import UserProfileFullScreen from "./components/UserProfileFullScreen";
import "./counseling-calendar.css";

import {
  addRecord,
  updateRecord
} from "./services/dataService";

import {
  calculateAssessment,
  dass21Choices,
  dass21Questions,
  DASS21_TITLE,
  gad7Choices,
  gad7Questions,
  GAD7_TITLE,
  phq9Choices,
  phq9DifficultyChoices,
  phq9Questions,
  PHQ9_TITLE,
  scoredQuestionIds,
  who5Choices,
  who5Questions,
  WHO5_TITLE
} from "./utils/assessment";




// ======================================================
// PREFERRED COUNSELORS FOR TEACHING / NON-TEACHING
// ======================================================

const PREFERRED_COUNSELORS = [
  {
    key: "coe",
    name: "April Santos",
    department: "College of Education"
  },
  {
    key: "cthm",
    name: "Christine Joy Agpuon",
    department: "College of Tourism and Hospitality Management"
  },
  {
    key: "cit",
    name: "Victoria Ferrer",
    department: "College of Industrial Technology"
  },
  {
    key: "casl",
    name: "Soral Rico",
    department: "College of Arts, Sciences and Letters"
  },
  {
    key: "ccs",
    name: "Joanna Mangapat",
    department: "College of Computing Sciences"
  },
  {
    key: "cbpa",
    name: "Trisha Becena",
    department: "College of Business and Public Administration"
  }
];


function normalizedCounselorDepartment(
  value
) {

  const clean =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();


  const aliases = {
    "coe":
      "college of education",

    "cte":
      "college of education",

    "cthm":
      "college of tourism and hospitality management",

    "cit":
      "college of industrial technology",

    "casl":
      "college of arts, sciences and letters",

    "cal":
      "college of arts, sciences and letters",

    "ccs":
      "college of computing sciences",

    "cbpa":
      "college of business and public administration"
  };


  return aliases[clean] || clean;
}


const GENDER_OPTIONS = [
  "Male",
  "Female"
];


const ANALYTICS_PRIORITIES = [
  "Low",
  "Moderate",
  "High",
  "Critical"
];


function normalizedGender(
  value
) {

  const clean =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();


  if (clean === "male") {
    return "Male";
  }


  if (clean === "female") {
    return "Female";
  }


  return "Not recorded";
}


function canonicalCollegeName(
  value
) {

  const normalized =
    normalizedCounselorDepartment(
      value
    );


  const matched =
    PREFERRED_COUNSELORS.find(
      counselor =>
        normalizedCounselorDepartment(
          counselor.department
        ) ===
        normalized
    );


  return (
    matched?.department ||
    String(
      value || ""
    ).trim() ||
    "Not recorded"
  );
}


function analyticsProgramName(
  record
) {

  const program =
    String(
      record?.program || ""
    ).trim();


  if (program) {
    return program;
  }


  if (
    employeeUserRole(
      record?.role
    )
  ) {
    return "Not applicable";
  }


  return "Not recorded";
}


function analyticsDimensionValue(
  record,
  dimension
) {

  if (dimension === "college") {

    return canonicalCollegeName(
      record?.department
    );
  }


  if (dimension === "program") {

    return analyticsProgramName(
      record
    );
  }


  if (dimension === "gender") {

    return normalizedGender(
      record?.gender
    );
  }


  return "Not recorded";
}


function operationalAnalyticsRows(
  assessments,
  consultations,
  dimension
) {

  const grouped =
    new Map();


  function ensureRow(label) {

    if (!grouped.has(label)) {

      grouped.set(
        label,
        {
          label,
          Low: 0,
          Moderate: 0,
          High: 0,
          Critical: 0,
          assessmentCases: 0,
          counselingRequests: 0,
          counselingSessions: 0
        }
      );
    }


    return grouped.get(label);
  }


  assessments.forEach(
    assessment => {

      const label =
        analyticsDimensionValue(
          assessment,
          dimension
        );


      const row =
        ensureRow(label);


      row.assessmentCases += 1;


      if (
        ANALYTICS_PRIORITIES.includes(
          assessment.priority
        )
      ) {

        row[
          assessment.priority
        ] += 1;
      }
    }
  );


  consultations.forEach(
    consultation => {

      const label =
        analyticsDimensionValue(
          consultation,
          dimension
        );


      const row =
        ensureRow(label);


      row.counselingRequests += 1;


      if (
        consultation.status ===
        "Schedule for counseling"
      ) {

        row.counselingSessions += 1;
      }
    }
  );


  const rows =
    Array.from(
      grouped.values()
    );


  if (dimension === "gender") {

    const order = {
      Male: 0,
      Female: 1,
      "Not recorded": 2
    };


    return rows.sort(
      (a, b) =>
        (
          order[a.label] ?? 99
        ) -
        (
          order[b.label] ?? 99
        )
    );
  }


  if (dimension === "college") {

    const collegeOrder =
      PREFERRED_COUNSELORS.map(
        counselor =>
          counselor.department
      );


    return rows.sort(
      (a, b) => {

        const aIndex =
          collegeOrder.indexOf(
            a.label
          );

        const bIndex =
          collegeOrder.indexOf(
            b.label
          );


        if (
          aIndex !== -1 ||
          bIndex !== -1
        ) {

          return (
            (
              aIndex === -1
                ? 999
                : aIndex
            ) -
            (
              bIndex === -1
                ? 999
                : bIndex
            )
          );
        }


        return a.label.localeCompare(
          b.label
        );
      }
    );
  }


  return rows.sort(
    (a, b) => {

      if (
        a.label ===
        "Not applicable"
      ) {
        return 1;
      }


      if (
        b.label ===
        "Not applicable"
      ) {
        return -1;
      }


      if (
        a.label ===
        "Not recorded"
      ) {
        return 1;
      }


      if (
        b.label ===
        "Not recorded"
      ) {
        return -1;
      }


      return a.label.localeCompare(
        b.label
      );
    }
  );
}


// ======================================================
// PROTECTED ROUTES
// ======================================================

function Protected({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-screen">
        Loading MindTrack…
      </div>
    );
  }

  return user
    ? children
    : <Navigate to="/" replace />;
}


// ======================================================
// DEFAULT PAGE BY ROLE
// ======================================================

function getDefaultPage() {

  return "/dashboard";
}


// ======================================================
// LOGIN
// ======================================================

function Login() {
  const {
    user,
    login,
    resetPassword,
    resendVerificationEmail,
    firebaseEnabled
  } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    needsVerification,
    setNeedsVerification
  ] = useState(false);

  const [
    verificationMessage,
    setVerificationMessage
  ] = useState("");


  const [
    passwordResetMessage,
    setPasswordResetMessage
  ] = useState("");


  if (user) {
    return (
      <Navigate
        to={getDefaultPage(user)}
        replace
      />
    );
  }


  async function submit(e) {
    e.preventDefault();

    setError("");
    setNeedsVerification(false);
    setVerificationMessage("");
    setPasswordResetMessage("");
    setLoading(true);

    try {

      await login(
        email,
        password
      );

      navigate("/dashboard");

    } catch (err) {

      console.error(
        "Login error:",
        err
      );

      if (
        err.code ===
        "auth/invalid-credential"
      ) {
        setError(
          "Invalid email or password."
        );

      } else if (
        err.code ===
        "auth/user-not-found"
      ) {
        setError(
          "Account not found."
        );

      } else if (
        err.code ===
        "auth/wrong-password"
      ) {
        setError(
          "Incorrect password."
        );

      } else if (
        err.code ===
        "auth/email-not-verified"
      ) {

        setError(
          "Your institutional email has not been verified yet. Open the verification email sent to your PSU account, then try logging in again."
        );

        setNeedsVerification(true);

      } else if (
        err.code ===
        "auth/institutional-email-required"
      ) {

        setError(
          "This account does not use an approved PSU institutional email address."
        );

      } else if (
        err.code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Too many login attempts. Please try again later."
        );

      } else {

        setError(
          err.message ||
          "Unable to login."
        );

      }

    } finally {

      setLoading(false);

    }
  }


  async function resendVerification() {

    setError("");
    setVerificationMessage("");
    setPasswordResetMessage("");


    if (!email.trim() || !password) {

      setError(
        "Enter your institutional email and password first, then resend the verification email."
      );

      return;
    }


    try {

      setLoading(true);


      const result =
        await resendVerificationEmail(
          email,
          password
        );


      if (
        result ===
        "already-verified"
      ) {

        setNeedsVerification(false);

        setVerificationMessage(
          "Your email is already verified. You can now log in."
        );

      } else {

        setNeedsVerification(true);

        setVerificationMessage(
          "A new verification email was sent to your institutional email address."
        );
      }

    } catch (err) {

      console.error(
        "Resend verification error:",
        err
      );


      setError(
        err?.message ||
        "Unable to resend the verification email."
      );

    } finally {

      setLoading(false);
    }
  }


  async function forgotPassword() {

    setError("");
    setVerificationMessage("");
    setPasswordResetMessage("");
    setNeedsVerification(false);


    if (!email.trim()) {

      setError(
        "Enter your PSU email first before requesting a password reset."
      );

      return;
    }


    try {

      setLoading(true);


      await resetPassword(
        email
      );


      setPasswordResetMessage(
        "Password reset instructions were sent to your PSU institutional email. Check your inbox and spam folder. If no account matches the email, no reset message will be received."
      );

    } catch (err) {

      console.error(
        "Password reset error:",
        err
      );


      if (
        err?.code ===
        "auth/too-many-requests"
      ) {

        setError(
          "Too many password reset requests. Please wait and try again later."
        );

      } else if (
        err?.code ===
        "auth/institutional-email-required"
      ) {

        setError(
          "Please use your official PSU institutional email address."
        );

      } else if (
        err?.code ===
        "auth/network-request-failed"
      ) {

        setError(
          "Unable to connect. Please check your internet connection and try again."
        );

      } else {

        // Keep the response generic so the login screen does not
        // reveal whether a specific email address has an account.
        setPasswordResetMessage(
          "If an account is registered with that PSU institutional email, password reset instructions will be sent to it."
        );
      }

    } finally {

      setLoading(false);
    }
  }


  return (
    <div className="auth-page">

      <div className="auth-card">

        <img
          src={psuLogo}
          alt="Pangasinan State University Logo"
          className="auth-logo-image"
        />

        <h1>
          MindTrack
        </h1>

        <p>
          PSU Lingayen Mental Health Monitoring System
        </p>


        <form onSubmit={submit} autoComplete="off">

          <label>
            Email

            <input
              value={email}
              onChange={
                event =>
                  setEmail(
                    event.target.value
                  )
              }
              type="email"
              name="mindtrack-login-email"
              placeholder="email@psu.edu.ph"
              autoComplete="username"
              required
            />

          </label>


          <label>
            Password

            <input
              value={password}
              onChange={
                e =>
                  setPassword(
                    e.target.value
                  )
              }
              type="password"
              name="mindtrack-login-password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>


          {firebaseEnabled && (

            <div className="forgot-password-row">

              <button
                type="button"
                className="forgot-password-link"
                onClick={forgotPassword}
                disabled={loading}
              >
                Forgot password?
              </button>

            </div>

          )}


          {error && (
            <div className="error-box">
              {error}
            </div>
          )}


          {verificationMessage && (
            <div className="success-box">
              {verificationMessage}
            </div>
          )}


          {passwordResetMessage && (
            <div className="success-box">
              {passwordResetMessage}
            </div>
          )}


          {needsVerification && (

            <button
              type="button"
              className="secondary-button auth-resend-button"
              disabled={loading}
              onClick={resendVerification}
            >
              Resend verification email
            </button>

          )}


          <button
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

        </form>


        {firebaseEnabled && (

          <div className="auth-switch">

            <span>
              Don't have an account?
            </span>

            <button
              type="button"
              className="register-link"
              onClick={
                () =>
                  navigate("/register")
              }
            >
              Register
            </button>

          </div>

        )}


        {!firebaseEnabled && (

          <div className="demo-accounts">

            <strong>
              Demo accounts — password:
              password123
            </strong>


            {[
              "student@psu.edu.ph",
              "faculty@psu.edu.ph",
              "personnel@psu.edu.ph",
              "counselor.ccs@psu.edu.ph",
              "superadmin@psu.edu.ph"
            ].map(emailAddress => (

              <button
                key={emailAddress}
                type="button"
                onClick={
                  () =>
                    setEmail(
                      emailAddress
                    )
                }
              >
                {emailAddress}
              </button>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}


// ======================================================
// REGISTER
// ======================================================

// ======================================================
// INSTITUTIONAL EMAIL POLICY
// ======================================================

// Confirm the exact PSU account domain with your ICT office.
// Add another domain here if PSU uses more than one institutional domain.
const INSTITUTIONAL_EMAIL_DOMAINS = [
  "psu.edu.ph"
];


function isInstitutionalEmail(email) {

  const cleanEmail =
    String(
      email || ""
    )
      .trim()
      .toLowerCase();


  const parts =
    cleanEmail.split("@");


  if (parts.length !== 2) {
    return false;
  }


  const domain =
    parts[1];


  return INSTITUTIONAL_EMAIL_DOMAINS.includes(
    domain
  );
}




// ======================================================
// PSU LINGAYEN COLLEGES AND PROGRAMS
// ======================================================

const PROGRAMS_BY_COLLEGE = {
  "College of Arts, Sciences and Letters": [
    "Bachelor of Arts in English Language",
    "Bachelor of Arts in Economics",
    "Bachelor of Science in Biology",
    "Bachelor of Science in Nutrition and Dietetics",
    "Bachelor of Science in Social Work"
  ],

  "College of Business and Public Administration": [
    "Bachelor of Public Administration",
    "Bachelor of Science in Business Administration - Major in Financial Management",
    "Bachelor of Science in Business Administration - Major in Operations Management"
  ],

  "College of Computing Sciences": [
    "Bachelor of Science in Computer Science",
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Mathematics - Major in Pure Math",
    "Bachelor of Science in Mathematics - Major in Statistics",
    "Bachelor of Science in Mathematics - Major in CIT"
  ],

  "College of Tourism and Hospitality Management": [
    "Bachelor of Science in Hospitality Management"
  ],

  "College of Education": [
    "Bachelor of Secondary Education",
    "Bachelor of Technical-Vocational Teacher Education",
    "Bachelor of Technology and Livelihood Education"
  ],

  "College of Industrial Technology": [
    "Bachelor of Industrial Technology - Major in Automotive Technology",
    "Bachelor of Industrial Technology - Major in Ceramics Technology",
    "Bachelor of Industrial Technology - Major in Civil Technology",
    "Bachelor of Industrial Technology - Major in Drafting Technology",
    "Bachelor of Industrial Technology - Major in Electrical Technology",
    "Bachelor of Industrial Technology - Major in Electronics Technology",
    "Bachelor of Industrial Technology - Major in Food Service Management",
    "Bachelor of Industrial Technology - Major in Garments, Fashion and Design",
    "Bachelor of Industrial Technology - Major in Mechanical Technology"
  ]
};


function collegePrograms(college) {

  return (
    PROGRAMS_BY_COLLEGE[
      college
    ] || []
  );
}


const PSGC_API =
  "https://psgc.cloud/api/v2";


async function fetchPsgcItems(path) {

  const response =
    await fetch(
      `${PSGC_API}${path}`
    );


  if (!response.ok) {

    throw new Error(
      "Unable to load Philippine address data."
    );
  }


  const result =
    await response.json();


  return Array.isArray(result)
    ? result
    : (
        Array.isArray(result?.data)
          ? result.data
          : []
      );
}


function Register() {
  const {
    register,
    firebaseEnabled
  } = useAuth();

  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    role: "",
    department: "",
    program: "",

    preferredCounselorDepartment: "",

    assignedCounselorId: "",
    assignedCounselorName: "",
    assignedCounselorDepartment: "",

    userNumber: "",
    gender: "",
    phoneNumber: "",

    regionCode: "",
    regionName: "",

    provinceCode: "",
    provinceName: "",

    municipalityCode: "",
    municipalityName: "",

    barangayCode: "",
    barangayName: "",

    streetName: "",

    facebookAccount: "",
    contactPersonName: "",
    contactPersonPhone: "",
    password: "",
    confirmPassword: ""
  });

  const [regions, setRegions] =
    useState([]);

  const [provinces, setProvinces] =
    useState([]);

  const [
    municipalities,
    setMunicipalities
  ] = useState([]);

  const [barangays, setBarangays] =
    useState([]);

  const [
    addressLoading,
    setAddressLoading
  ] = useState(false);

  const [
    addressError,
    setAddressError
  ] = useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  const counselorDirectoryRows =
    useRows(
      "counselorDirectory"
    );


  const availableCounselors =
    useMemo(
      () =>
        PREFERRED_COUNSELORS.map(
          preferred => {

            const directoryEntry =
              counselorDirectoryRows.find(
                counselor =>
                  counselor.active !== false &&
                  Boolean(
                    counselor.id &&
                    counselor.department
                  ) &&
                  normalizedCounselorDepartment(
                    counselor.department
                  ) ===
                  normalizedCounselorDepartment(
                    preferred.department
                  )
              );


            return {
              ...preferred,

              // Keep the exact six requested names/colleges visible
              // in the registration dropdown. The Firebase UID and
              // stored counselor name come from the safe directory.
              id:
                directoryEntry?.id ||
                "",

              firebaseName:
                directoryEntry?.name ||
                "",

              firebaseDepartment:
                directoryEntry?.department ||
                "",

              linked:
                Boolean(
                  directoryEntry?.id
                )
            };
          }
        ),
      [
        counselorDirectoryRows
      ]
    );


  useEffect(() => {

    let active = true;


    async function loadRegions() {

      try {

        setAddressLoading(true);
        setAddressError("");


        const rows =
          await fetchPsgcItems(
            "/regions"
          );


        if (active) {

          setRegions(rows);

        }

      } catch (err) {

        console.error(
          "Unable to load regions:",
          err
        );


        if (active) {

          setAddressError(
            "Unable to load the Philippine address list. Please check your internet connection and refresh the page."
          );

        }

      } finally {

        if (active) {

          setAddressLoading(false);

        }
      }
    }


    loadRegions();


    return () => {

      active = false;

    };

  }, []);


  function change(e) {

    const {
      name,
      value
    } = e.target;


    const numericFields = [
      "phoneNumber",
      "contactPersonPhone"
    ];


    const nextValue =
      numericFields.includes(name)
        ? value
            .replace(/\D/g, "")
            .slice(0, 11)
        : value;


    setForm(current => {

      if (name === "role") {

        return {
          ...current,
          role: nextValue,
          department: "",
          program: "",
          preferredCounselorDepartment: "",
          assignedCounselorId: "",
          assignedCounselorName: "",
          assignedCounselorDepartment: ""
        };
      }


      if (name === "department") {

        return {
          ...current,
          department: nextValue,
          program: ""
        };
      }


      if (
        name ===
        "preferredCounselorDepartment"
      ) {

        const counselor =
          availableCounselors.find(
            item =>
              item.department ===
              nextValue
          );


        return {
          ...current,

          preferredCounselorDepartment:
            nextValue,

          assignedCounselorId:
            counselor?.id ||
            "",

          assignedCounselorName:
            counselor?.firebaseName ||
            counselor?.name ||
            "",

          assignedCounselorDepartment:
            counselor?.firebaseDepartment ||
            "",

          // Keep the existing department-based counselor access
          // model compatible. The visible dropdown still shows the
          // full requested college name even if an older counselor
          // profile stores an abbreviation such as CCS.
          department:
            counselor?.firebaseDepartment ||
            "",

          program:
            ""
        };
      }


      return {
        ...current,
        [name]: nextValue
      };
    });
  }

  async function changeRegion(e) {

    const regionCode =
      e.target.value;


    const selectedRegion =
      regions.find(
        item =>
          item.code ===
          regionCode
      );


    setForm(current => ({
      ...current,

      regionCode,

      regionName:
        selectedRegion?.name ||
        "",

      provinceCode: "",
      provinceName: "",

      municipalityCode: "",
      municipalityName: "",

      barangayCode: "",
      barangayName: ""
    }));


    setProvinces([]);
    setMunicipalities([]);
    setBarangays([]);


    if (!regionCode) {
      return;
    }


    try {

      setAddressLoading(true);
      setAddressError("");


      const regionProvinces =
        await fetchPsgcItems(
          `/regions/${encodeURIComponent(
            regionCode
          )}/provinces`
        );


      setProvinces(
        regionProvinces
      );


      // NCR has no province level.
      // Load its cities/municipalities directly.
      if (
        regionProvinces.length ===
        0
      ) {

        const regionPlaces =
          await fetchPsgcItems(
            `/regions/${encodeURIComponent(
              regionCode
            )}/cities-municipalities`
          );


        setMunicipalities(
          regionPlaces
        );


        setForm(current => ({
          ...current,

          provinceCode:
            "__NOT_APPLICABLE__",

          provinceName:
            "Not Applicable"
        }));
      }

    } catch (err) {

      console.error(
        "Unable to load provinces:",
        err
      );


      setAddressError(
        "Unable to load provinces for the selected region."
      );

    } finally {

      setAddressLoading(false);

    }
  }


  async function changeProvince(e) {

    const provinceCode =
      e.target.value;


    setMunicipalities([]);
    setBarangays([]);


    if (
      provinceCode ===
      "__REGION_DIRECT__"
    ) {

      setForm(current => ({
        ...current,

        provinceCode,

        provinceName:
          "Not Applicable",

        municipalityCode: "",
        municipalityName: "",

        barangayCode: "",
        barangayName: ""
      }));


      try {

        setAddressLoading(true);
        setAddressError("");


        const regionPlaces =
          await fetchPsgcItems(
            `/regions/${encodeURIComponent(
              form.regionCode
            )}/cities-municipalities`
          );


        setMunicipalities(
          regionPlaces
        );

      } catch (err) {

        console.error(
          "Unable to load cities and municipalities:",
          err
        );


        setAddressError(
          "Unable to load cities or municipalities for the selected region."
        );

      } finally {

        setAddressLoading(false);

      }


      return;
    }


    const selectedProvince =
      provinces.find(
        item =>
          item.code ===
          provinceCode
      );


    setForm(current => ({
      ...current,

      provinceCode,

      provinceName:
        selectedProvince?.name ||
        "",

      municipalityCode: "",
      municipalityName: "",

      barangayCode: "",
      barangayName: ""
    }));


    if (!provinceCode) {
      return;
    }


    try {

      setAddressLoading(true);
      setAddressError("");


      const places =
        await fetchPsgcItems(
          `/provinces/${encodeURIComponent(
            provinceCode
          )}/cities-municipalities`
        );


      setMunicipalities(
        places
      );

    } catch (err) {

      console.error(
        "Unable to load cities and municipalities:",
        err
      );


      setAddressError(
        "Unable to load cities or municipalities for the selected province."
      );

    } finally {

      setAddressLoading(false);

    }
  }


  async function changeMunicipality(e) {

    const municipalityCode =
      e.target.value;


    const selectedMunicipality =
      municipalities.find(
        item =>
          item.code ===
          municipalityCode
      );


    setForm(current => ({
      ...current,

      municipalityCode,

      municipalityName:
        selectedMunicipality?.name ||
        "",

      barangayCode: "",
      barangayName: ""
    }));


    setBarangays([]);


    if (!municipalityCode) {
      return;
    }


    try {

      setAddressLoading(true);
      setAddressError("");


      const rows =
        await fetchPsgcItems(
          `/cities-municipalities/${encodeURIComponent(
            municipalityCode
          )}/barangays`
        );


      setBarangays(rows);

    } catch (err) {

      console.error(
        "Unable to load barangays:",
        err
      );


      setAddressError(
        "Unable to load barangays for the selected city or municipality."
      );

    } finally {

      setAddressLoading(false);

    }
  }


  function changeBarangay(e) {

    const barangayCode =
      e.target.value;


    const selectedBarangay =
      barangays.find(
        item =>
          item.code ===
          barangayCode
      );


    setForm(current => ({
      ...current,

      barangayCode,

      barangayName:
        selectedBarangay?.name ||
        ""
    }));
  }


  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim()) {
      setError(
        "Please enter your first name."
      );
      return;
    }

    if (!form.lastName.trim()) {
      setError(
        "Please enter your last name."
      );
      return;
    }

    if (!form.email.trim()) {
      setError(
        "Please enter your PSU email address."
      );
      return;
    }

    if (
      !isInstitutionalEmail(
        form.email
      )
    ) {
      setError(
        "Please use an email address ending in @psu.edu.ph."
      );
      return;
    }

    if (!form.role) {
      setError(
        "Please select your account type."
      );
      return;
    }

    if (
      form.role === "student" &&
      !form.department
    ) {
      setError(
        "Please select your college or office."
      );
      return;
    }

    if (
      [
        "teaching",
        "non_teaching"
      ].includes(
        form.role
      ) &&
      !form.preferredCounselorDepartment
    ) {
      setError(
        "Please select your preferred counselor."
      );
      return;
    }


    if (
      [
        "teaching",
        "non_teaching"
      ].includes(
        form.role
      ) &&
      (
        !form.assignedCounselorId ||
        !form.assignedCounselorName ||
        !form.assignedCounselorDepartment
      )
    ) {
      setError(
        "The selected counselor is not yet linked to the Firebase counselor directory. Please ask the MindTrack administrator to run the six-counselor sync once."
      );
      return;
    }

    if (
      form.role === "student" &&
      !form.program
    ) {
      setError(
        "Please select your program."
      );
      return;
    }

    if (!form.userNumber.trim()) {
      setError(
        form.role === "student"
          ? "Please enter your student number."
          : "Please enter your employee number."
      );
      return;
    }

    if (
      !GENDER_OPTIONS.includes(
        form.gender
      )
    ) {
      setError(
        "Please select Male or Female."
      );
      return;
    }

    if (!form.phoneNumber.trim()) {
      setError(
        "Please enter your phone number."
      );
      return;
    }

    if (form.phoneNumber.length !== 11) {
      setError(
        "Phone number must contain exactly 11 digits."
      );
      return;
    }

    if (!form.contactPersonName.trim()) {
      setError(
        "Please enter your contact person's name."
      );
      return;
    }

    if (!form.contactPersonPhone.trim()) {
      setError(
        "Please enter your contact person's phone number."
      );
      return;
    }

    if (
      form.contactPersonPhone.length !== 11
    ) {
      setError(
        "Contact person phone number must contain exactly 11 digits."
      );
      return;
    }

    if (!form.regionCode) {
      setError(
        "Please select your region."
      );
      return;
    }

    if (!form.provinceCode) {
      setError(
        "Please select your province."
      );
      return;
    }

    if (!form.municipalityCode) {
      setError(
        "Please select your city or municipality."
      );
      return;
    }

    if (!form.barangayCode) {
      setError(
        "Please select your barangay."
      );
      return;
    }

    if (!form.streetName.trim()) {
      setError(
        "Please enter your street name, house number, or purok."
      );
      return;
    }

    if (form.password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }


    const fullName =
      [
        form.firstName.trim(),
        form.middleName.trim(),
        form.lastName.trim()
      ]
        .filter(Boolean)
        .join(" ");


    const fullAddress =
      [
        form.streetName.trim(),

        form.barangayName
          ? `Barangay ${form.barangayName}`
          : "",

        form.municipalityName,

        form.provinceName ===
          "Not Applicable"
          ? ""
          : form.provinceName,

        form.regionName
      ]
        .filter(Boolean)
        .join(", ");


    try {
      setLoading(true);

      await register({
        name: fullName,
        email: form.email,
        password: form.password,
        role: form.role,
        department: form.department,
        program:
          form.role === "student"
            ? form.program
            : "",

        assignedCounselorId:
          form.assignedCounselorId,

        assignedCounselorName:
          form.assignedCounselorName,

        assignedCounselorDepartment:
          form.assignedCounselorDepartment,

        userNumber: form.userNumber,
        gender: form.gender,
        phoneNumber: form.phoneNumber,
        address: fullAddress,
        facebookAccount:
          form.facebookAccount,
        contactPersonName:
          form.contactPersonName,
        contactPersonPhone:
          form.contactPersonPhone
      });

      alert(
        "Registration successful. A verification link was sent to your PSU institutional email. Verify your email first before logging in."
      );

      navigate("/login");

    } catch (err) {
      console.error(
        "Registration error:",
        err
      );

      if (
        err.code ===
        "auth/email-already-in-use"
      ) {
        setError(
          "This institutional email is already registered and can only be used for one MindTrack account."
        );

      } else if (
        err.code ===
        "auth/invalid-email"
      ) {
        setError(
          "Please enter a valid email address."
        );

      } else if (
        err.code ===
        "auth/weak-password"
      ) {
        setError(
          "Please use a stronger password."
        );

      } else if (
        err.code ===
          "permission-denied" ||
        err.code ===
          "firestore/permission-denied"
      ) {
        setError(
          "Account was created, but Firestore did not allow the profile to be saved."
        );

      } else {
        setError(
          err.message ||
          "Unable to create your account."
        );
      }

    } finally {
      setLoading(false);
    }
  }


  if (!firebaseEnabled) {
    return (
      <div className="auth-page">

        <div className="auth-card">

          <img
            src={psuLogo}
            alt="Pangasinan State University Logo"
            className="auth-logo-image"
          />

          <h1>
            Registration
          </h1>

          <div className="error-box">
            Firebase must be enabled before registration can be used.
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={
              () =>
                navigate("/login")
            }
          >
            Back to Login
          </button>

        </div>

      </div>
    );
  }


  return (
    <div className="auth-page">

      <div className="auth-card register-card">

        <img
          src={psuLogo}
          alt="Pangasinan State University Logo"
          className="auth-logo-image"
        />

        <h1>
          Create Account
        </h1>

        <p>
          PSU Lingayen Mental Health Monitoring System
        </p>


        <form
          onSubmit={submit}
          autoComplete="off"
        >

          <p className="required-fields-note">
            <span
              className="required-asterisk"
              aria-hidden="true"
            >
              *
            </span>
            {" "}
            Required field
          </p>


          <div className="registration-section">

            <h2>
              Account Information
            </h2>


            <div className="registration-grid">

              <label>
                First Name
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={change}
                  placeholder="Enter first name"
                  required
                />
              </label>


              <label>
                Middle Name
                {" "}

                <span className="optional-text">
                  (Optional)
                </span>

                <input
                  type="text"
                  name="middleName"
                  value={form.middleName}
                  onChange={change}
                  placeholder="Enter middle name"
                />
              </label>


              <label>
                Last Name
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={change}
                  placeholder="Enter last name"
                  required
                />
              </label>


              <label>
                Email
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={change}
                  placeholder="email@psu.edu.ph"
                  autoComplete="email"
                  required
                />

              </label>


              <label>
                Account Type
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <select
                  name="role"
                  value={form.role}
                  onChange={change}
                  required
                >

                  <option
                    value=""
                    disabled
                  >
                    Select account type
                  </option>

                  <option value="student">
                    Student
                  </option>

                  <option value="teaching">
                    Teaching
                  </option>

                  <option value="non_teaching">
                    Non-teaching
                  </option>

                </select>
              </label>


              {form.role === "student" && (

                <label>
                  College / Office
                  <span
                    className="required-asterisk"
                    aria-hidden="true"
                  >
                    *
                  </span>

                  <select
                    name="department"
                    value={form.department}
                    onChange={change}
                    required
                  >

                    <option
                      value=""
                      disabled
                    >
                      Select college / office
                    </option>

                    <option value="College of Education">
                      College of Education
                    </option>

                    <option value="College of Tourism and Hospitality Management">
                      College of Tourism and Hospitality Management
                    </option>

                    <option value="College of Industrial Technology">
                      College of Industrial Technology
                    </option>

                    <option value="College of Arts, Sciences and Letters">
                      College of Arts, Sciences and Letters
                    </option>

                    <option value="College of Computing Sciences">
                      College of Computing Sciences
                    </option>

                    <option value="College of Business and Public Administration">
                      College of Business and Public Administration
                    </option>

                  </select>
                </label>

              )}


              {[
                "teaching",
                "non_teaching"
              ].includes(
                form.role
              ) && (

                <label>
                  Preferred Counselor
                  <span
                    className="required-asterisk"
                    aria-hidden="true"
                  >
                    *
                  </span>

                  <select
                    name="preferredCounselorDepartment"
                    value={
                      form.preferredCounselorDepartment
                    }
                    onChange={change}
                    required
                  >

                    <option
                      value=""
                      disabled
                    >
                      Select preferred counselor
                    </option>

                    {availableCounselors.map(
                      counselor => (

                        <option
                          key={
                            counselor.key
                          }
                          value={
                            counselor.department
                          }
                        >
                          {
                            `${counselor.name} [${counselor.department}]`
                          }
                        </option>

                      )
                    )}

                  </select>

                  <small className="optional-text">
                    Choose one of the six Guidance Counselors. Counselor assignment is linked to Firebase by college/department.
                  </small>
                </label>

              )}


              {form.role === "student" && (

                <label>
                  Program
                  <span
                    className="required-asterisk"
                    aria-hidden="true"
                  >
                    *
                  </span>

                  <select
                    name="program"
                    value={form.program}
                    onChange={change}
                    disabled={!form.department}
                    required
                  >

                    <option
                      value=""
                      disabled
                    >
                      {
                        form.department
                          ? "Select program"
                          : "Select college first"
                      }
                    </option>


                    {collegePrograms(
                      form.department
                    ).map(
                      program => (

                        <option
                          key={program}
                          value={program}
                        >
                          {program}
                        </option>

                      )
                    )}

                  </select>

                </label>

              )}


              <label>

                {form.role === "student"
                  ? "Student Number"
                  : [
                      "teaching",
                      "non_teaching",
                      "faculty",
                      "personnel"
                    ].includes(
                      form.role
                    )
                    ? "Employee Number"
                    : "Student / Employee Number"}

                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <input
                  type="text"
                  name="userNumber"
                  value={form.userNumber}
                  onChange={change}
                  required
                />

              </label>

            </div>

          </div>


          <div className="registration-section">

            <h2>
              Personal Information
            </h2>


            <div className="registration-grid">

              <label>
                Gender
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <select
                  name="gender"
                  value={form.gender}
                  onChange={change}
                  required
                >

                  <option
                    value=""
                    disabled
                  >
                    Select gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                </select>
              </label>


              <label>
                Phone Number
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <input
                  type="tel"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={change}
                  inputMode="numeric"
                  pattern="[0-9]{11}"
                  minLength={11}
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  required
                />
              </label>


              <label>
                Facebook Account
                {" "}

                <span className="optional-text">
                  (Optional)
                </span>

                <input
                  type="text"
                  name="facebookAccount"
                  value={form.facebookAccount}
                  onChange={change}
                  placeholder="Facebook name or profile link"
                />
              </label>

            </div>


            <h3 className="registration-subheading">
              Home Address
            </h3>


            {addressError && (
              <div className="error-box">
                {addressError}
              </div>
            )}


            <div className="registration-grid">

              <label>
                Region
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <select
                  value={form.regionCode}
                  onChange={changeRegion}
                  disabled={
                    addressLoading &&
                    regions.length === 0
                  }
                  required
                >

                  <option value="">
                    {addressLoading &&
                    regions.length === 0
                      ? "Loading regions..."
                      : "Select region"}
                  </option>


                  {regions.map(
                    item => (

                      <option
                        key={item.code}
                        value={item.code}
                      >
                        {item.name}
                      </option>

                    )
                  )}

                </select>
              </label>


              <label>
                Province
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <select
                  value={form.provinceCode}
                  onChange={changeProvince}
                  disabled={
                    !form.regionCode ||
                    (
                      provinces.length === 0 &&
                      form.provinceCode ===
                        "__NOT_APPLICABLE__"
                    )
                  }
                  required
                >

                  {form.provinceCode ===
                    "__NOT_APPLICABLE__"
                    ? (
                      <option
                        value="__NOT_APPLICABLE__"
                      >
                        Not Applicable
                      </option>
                    )
                    : (
                      <>
                        <option value="">
                          Select province
                        </option>


                        {provinces.map(
                          item => (

                            <option
                              key={item.code}
                              value={item.code}
                            >
                              {item.name}
                            </option>

                          )
                        )}


                        {provinces.length > 0 && (
                          <option
                            value="__REGION_DIRECT__"
                          >
                            Independent City / No Province
                          </option>
                        )}

                      </>
                    )
                  }

                </select>
              </label>


              <label>
                City / Municipality
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <select
                  value={
                    form.municipalityCode
                  }
                  onChange={
                    changeMunicipality
                  }
                  disabled={
                    !form.provinceCode ||
                    municipalities.length ===
                      0
                  }
                  required
                >

                  <option value="">
                    {addressLoading &&
                    form.provinceCode &&
                    municipalities.length === 0
                      ? "Loading cities / municipalities..."
                      : "Select city / municipality"}
                  </option>


                  {municipalities.map(
                    item => (

                      <option
                        key={item.code}
                        value={item.code}
                      >
                        {item.name}
                      </option>

                    )
                  )}

                </select>
              </label>


              <label>
                Barangay
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <select
                  value={form.barangayCode}
                  onChange={changeBarangay}
                  disabled={
                    !form.municipalityCode ||
                    barangays.length === 0
                  }
                  required
                >

                  <option value="">
                    {addressLoading &&
                    form.municipalityCode &&
                    barangays.length === 0
                      ? "Loading barangays..."
                      : "Select barangay"}
                  </option>


                  {barangays.map(
                    item => (

                      <option
                        key={item.code}
                        value={item.code}
                      >
                        {item.name}
                      </option>

                    )
                  )}

                </select>
              </label>


              <label className="full-width-field">
                Street Name / House No. / Purok
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <input
                  type="text"
                  name="streetName"
                  value={form.streetName}
                  onChange={change}
                  placeholder="Example: 123 Rizal Street, Purok 2"
                  required
                />
              </label>

            </div>


            <div className="profile-note">

              Address preview:
              {" "}

              <strong>
                {
                  [
                    form.streetName.trim(),

                    form.barangayName
                      ? `Barangay ${form.barangayName}`
                      : "",

                    form.municipalityName,

                    form.provinceName ===
                      "Not Applicable"
                      ? ""
                      : form.provinceName,

                    form.regionName
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                  "Complete the address fields above."
                }
              </strong>

            </div>

          </div>


          <div className="registration-section">

            <h2>
              Contact Person
            </h2>

            <p className="registration-section-note">
              Required for user safety and emergency contact purposes.
            </p>


            <div className="registration-grid">

              <label>
                Contact Person Name
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <input
                  type="text"
                  name="contactPersonName"
                  value={form.contactPersonName}
                  onChange={change}
                  placeholder="Enter contact person's full name"
                  required
                />
              </label>


              <label>
                Contact Person Phone Number
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <input
                  type="tel"
                  name="contactPersonPhone"
                  value={form.contactPersonPhone}
                  onChange={change}
                  inputMode="numeric"
                  pattern="[0-9]{11}"
                  minLength={11}
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  required
                />
              </label>

            </div>

          </div>


          <div className="registration-section">

            <h2>
              Security
            </h2>


            <div className="registration-grid">

              <label>
                Password
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={change}
                  autoComplete="new-password"
                  required
                />
              </label>


              <label>
                Confirm Password
                <span
                  className="required-asterisk"
                  aria-hidden="true"
                >
                  *
                </span>

                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={change}
                  autoComplete="new-password"
                  required
                />
              </label>

            </div>

          </div>


          {error && (
            <div className="error-box">
              {error}
            </div>
          )}


          <button
            className="primary-button"
            disabled={
              loading ||
              addressLoading
            }
          >

            {loading
              ? "Creating Account..."
              : "Register"}

          </button>

        </form>


        <div className="auth-switch">

          <span>
            Already have an account?
          </span>

          <button
            type="button"
            className="register-link"
            onClick={
              () =>
                navigate("/login")
            }
          >
            Login
          </button>

        </div>

      </div>

    </div>
  );
}


// ======================================================
// FIRESTORE COLLECTION HOOK
// ======================================================

function useRows(
  name,
  filters = {},
  enabled = true
) {

  const [rows, setRows] =
    useState([]);


  useEffect(
    () => {

      if (!enabled) {

        setRows([]);

        return undefined;
      }


      const constraints = [];


      if (filters.ownerId) {

        constraints.push(
          where(
            "ownerId",
            "==",
            filters.ownerId
          )
        );
      }


      if (filters.department) {

        constraints.push(
          where(
            "department",
            "==",
            filters.department
          )
        );
      }


      if (filters.role) {

        constraints.push(
          where(
            "role",
            "==",
            filters.role
          )
        );
      }


      if (filters.status) {

        constraints.push(
          where(
            "status",
            "==",
            filters.status
          )
        );
      }


      if (filters.assignedCounselorId) {

        constraints.push(
          where(
            "assignedCounselorId",
            "==",
            filters.assignedCounselorId
          )
        );
      }


      if (filters.counselorId) {

        constraints.push(
          where(
            "counselorId",
            "==",
            filters.counselorId
          )
        );
      }


      if (
        filters.active !==
        undefined
      ) {

        constraints.push(
          where(
            "active",
            "==",
            filters.active
          )
        );
      }


      const rowsQuery =
        query(
          collection(
            db,
            name
          ),
          ...constraints
        );


      const unsubscribe =
        onSnapshot(
          rowsQuery,

          snapshot => {

            const incomingRows =
              snapshot.docs.map(
                item => ({
                  id:
                    item.id,

                  ...item.data()
                })
              );


            incomingRows.sort(
              (a, b) => {

                function valueToMillis(
                  value
                ) {

                  if (!value) {
                    return 0;
                  }


                  if (
                    typeof value.toMillis ===
                    "function"
                  ) {

                    return value.toMillis();
                  }


                  if (
                    typeof value.seconds ===
                    "number"
                  ) {

                    return (
                      value.seconds *
                      1000
                    );
                  }


                  const parsed =
                    new Date(
                      value
                    ).getTime();


                  return Number.isNaN(
                    parsed
                  )
                    ? 0
                    : parsed;
                }


                return (
                  valueToMillis(
                    b.createdAt
                  ) -
                  valueToMillis(
                    a.createdAt
                  )
                );
              }
            );


            setRows(
              incomingRows
            );
          },

          error => {

            // Keep Firestore listener errors contained inside
            // this hook instead of leaving an uncaught snapshot
            // listener error in React.
            console.error(
              `Unable to load ${name}:`,
              error
            );


            setRows([]);
          }
        );


      return unsubscribe;

    },

    [
      name,
      filters.ownerId,
      filters.department,
      filters.role,
      filters.status,
      filters.assignedCounselorId,
      filters.counselorId,
      filters.active,
      enabled
    ]
  );


  return rows;
}


// ======================================================
// TRANSFERRED OWNER ROWS
// Loads records for users formally transferred to the
// currently assigned counselor.
// ======================================================

function useTransferredOwnerRows(
  collectionName,
  counselorId
) {

  const [rows, setRows] =
    useState([]);


  useEffect(
    () => {

      if (!counselorId) {

        setRows([]);

        return undefined;
      }


      let ownerUnsubscribers = [];


      const accessQuery =
        query(
          collection(
            db,
            "transferAccess"
          ),
          where(
            "counselorId",
            "==",
            counselorId
          ),
          where(
            "active",
            "==",
            true
          )
        );


      const accessUnsubscribe =
        onSnapshot(
          accessQuery,

          accessSnapshot => {

            ownerUnsubscribers.forEach(
              unsubscribe =>
                unsubscribe()
            );

            ownerUnsubscribers = [];


            if (
              accessSnapshot.empty
            ) {

              setRows([]);

              return;
            }


            const rowsByOwner =
              new Map();


            accessSnapshot.docs.forEach(
              accessDocument => {

                const access =
                  accessDocument.data();


                if (!access.ownerId) {
                  return;
                }


                const ownerQuery =
                  query(
                    collection(
                      db,
                      collectionName
                    ),
                    where(
                      "ownerId",
                      "==",
                      access.ownerId
                    )
                  );


                const ownerUnsubscribe =
                  onSnapshot(
                    ownerQuery,

                    snapshot => {

                      rowsByOwner.set(
                        access.ownerId,

                        snapshot.docs.map(
                          item => ({
                            id:
                              item.id,

                            ...item.data()
                          })
                        )
                      );


                      setRows(
                        mergeRowsById(
                          ...Array.from(
                            rowsByOwner.values()
                          )
                        )
                      );
                    },

                    error => {

                      console.error(
                        `Unable to load transferred ${collectionName} records for ${access.ownerId}:`,
                        error
                      );


                      rowsByOwner.set(
                        access.ownerId,
                        []
                      );


                      setRows(
                        mergeRowsById(
                          ...Array.from(
                            rowsByOwner.values()
                          )
                        )
                      );
                    }
                  );


                ownerUnsubscribers.push(
                  ownerUnsubscribe
                );
              }
            );
          },

          error => {

            console.error(
              "Unable to load transferred-user access:",
              error
            );

            setRows([]);
          }
        );


      return () => {

        accessUnsubscribe();


        ownerUnsubscribers.forEach(
          unsubscribe =>
            unsubscribe()
        );
      };

    },

    [
      collectionName,
      counselorId
    ]
  );


  return rows;
}


// ======================================================
// COUNSELOR TRANSFER HELPERS
// ======================================================

function transferAccessDocumentId(
  ownerId,
  counselorId
) {

  return `${ownerId}_${counselorId}`;
}


function mergeRowsById(...lists) {

  const map = new Map();

  lists
    .flat()
    .forEach(
      row => {

        if (row?.id) {
          map.set(
            row.id,
            {
              ...(map.get(row.id) || {}),
              ...row
            }
          );
        }
      }
    );

  return Array.from(
    map.values()
  );
}


function appointmentStartDate(row) {

  if (!row?.date || !row?.time) {
    return null;
  }


  const timeMap = {
    "8:00 AM": "08:00",
    "9:00 AM": "09:00",
    "10:00 AM": "10:00",
    "11:00 AM": "11:00",
    "1:00 PM": "13:00",
    "2:00 PM": "14:00",
    "3:00 PM": "15:00",
    "4:00 PM": "16:00"
  };


  const normalizedTime =
    timeMap[row.time] ||
    row.time;


  const timeWithSeconds =
    /^\d{2}:\d{2}$/.test(
      normalizedTime
    )
      ? `${normalizedTime}:00`
      : normalizedTime;


  // Counseling schedules are campus-local (Philippines / UTC+8).
  // Using an explicit offset keeps transfer deadlines consistent
  // even if a browser is temporarily using another timezone.
  const date =
    new Date(
      `${row.date}T${timeWithSeconds}+08:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }


  return date;
}


function appointmentHasStarted(row) {

  const start =
    appointmentStartDate(row);


  return Boolean(
    start &&
    Date.now() >=
      start.getTime()
  );
}


function transferRequestHasStarted(
  transfer
) {

  const scheduledStartAt =
    transfer?.scheduledStartAt;


  if (
    scheduledStartAt &&
    typeof scheduledStartAt.toMillis ===
      "function"
  ) {

    return (
      Date.now() >=
      scheduledStartAt.toMillis()
    );
  }


  if (
    scheduledStartAt instanceof Date
  ) {

    return (
      Date.now() >=
      scheduledStartAt.getTime()
    );
  }


  return appointmentHasStarted(
    transfer
  );
}


// ======================================================
// DASHBOARD ACCESS
// Student / Teaching / Non-teaching do not use Dashboard.
// Counselor and Super Admin keep Dashboard access.
// ======================================================

function DashboardRoute() {

  return <Dashboard />;
}


// ======================================================
// DASHBOARD
// ======================================================

function Dashboard() {

  const { user } =
    useAuth();


  const isSuperAdmin =
    user.role === "super_admin";


  const isCounselor =
    user.role === "counselor";


  const assessmentFilters =
    isSuperAdmin
      ? {}
      : isCounselor
        ? {
            department:
              user.department
          }
        : {
            ownerId:
              user.id
          };


  const consultationFilters =
    isSuperAdmin
      ? {}
      : isCounselor
        ? {
            department:
              user.department
          }
        : {
            ownerId:
              user.id
          };


  const referralFilters =
    isSuperAdmin
      ? {}
      : isCounselor
        ? {
            department:
              user.department
          }
        : {
            ownerId:
              user.id
          };


  const assessments =
    useRows(
      "assessments",
      assessmentFilters
    );


  const consultations =
    useRows(
      "consultations",
      consultationFilters
    );


  const referrals =
    useRows(
      "referrals",
      referralFilters
    );


  const pendingTransferRows =
    useRows(
      "transferRequests",
      {
        status:
          "Pending approval"
      }
    );


  const pendingTransferRequests =
    pendingTransferRows.filter(
      row =>
        isCounselor &&
        row.requestedById !==
          user.id
    );


  const outgoingTransferRequests =
    pendingTransferRows.filter(
      row =>
        isCounselor &&
        row.requestedById ===
          user.id
    );


  const [
    approvingTransferId,
    setApprovingTransferId
  ] = useState("");


  async function approveTransfer(
    transfer
  ) {

    if (!isCounselor) {
      return;
    }


    if (
      !window.confirm(
        `Approve the transfer of ${transfer.ownerName || "this user"} from ${transfer.requestedByName || "the current counselor"}? You will become the user's assigned counselor and gain access to their counseling-request and assessment history.`
      )
    ) {
      return;
    }


    try {

      setApprovingTransferId(
        transfer.id
      );


      const transferRef =
        doc(
          db,
          "transferRequests",
          transfer.id
        );


      const consultationRef =
        doc(
          db,
          "consultations",
          transfer.consultationId
        );


      const profileRef =
        doc(
          db,
          "counselingProfiles",
          transfer.ownerId
        );


      const ownerUserRef =
        doc(
          db,
          "users",
          transfer.ownerId
        );


      const accessRef =
        doc(
          db,
          "transferAccess",
          transferAccessDocumentId(
            transfer.ownerId,
            user.id
          )
        );


      await runTransaction(
        db,
        async transaction => {

          const transferSnap =
            await transaction.get(
              transferRef
            );


          if (!transferSnap.exists()) {
            throw new Error(
              "This transfer request no longer exists."
            );
          }


          const current =
            transferSnap.data();


          // Do NOT read the private consultation before approval.
          // A counselor from another college is intentionally not
          // allowed to read that full counseling request yet.
          //
          // transferRequests contains only the safe fields needed
          // to approve the transfer. Full consultation/profile
          // access is granted only after the transaction succeeds.
          if (
            current.consultationId !==
              transfer.consultationId ||
            current.ownerId !==
              transfer.ownerId
          ) {

            throw new Error(
              "The transfer request no longer matches the selected user or counseling request."
            );
          }


          if (
            transferRequestHasStarted(
              current
            )
          ) {

            throw new Error(
              "This transfer can no longer be approved because the scheduled counseling start time has already passed."
            );
          }


          const slotReservingStatus =
            [
              "Pending approval",
              "For review",
              "Schedule for counseling"
            ].includes(
              current.requestStatus ||
              ""
            );


          const slotDate =
            current.date ||
            "";


          const slotTime =
            current.time ||
            "";


          const oldSlotRef =
            current.requestedById &&
            slotDate &&
            slotTime
              ? doc(
                  db,
                  "counselingScheduleSlots",
                  counselingSlotDocumentId(
                    current.requestedById,
                    slotDate,
                    slotTime
                  )
                )
              : null;


          const newSlotRef =
            slotReservingStatus &&
            slotDate &&
            slotTime
              ? doc(
                  db,
                  "counselingScheduleSlots",
                  counselingSlotDocumentId(
                    user.id,
                    slotDate,
                    slotTime
                  )
                )
              : null;


          let oldSlotSnap =
            null;

          let newSlotSnap =
            null;


          if (oldSlotRef) {

            oldSlotSnap =
              await transaction.get(
                oldSlotRef
              );
          }


          if (newSlotRef) {

            newSlotSnap =
              await transaction.get(
                newSlotRef
              );
          }


          if (
            newSlotSnap
              ?.exists() &&
            activeCounselingSlotState(
              newSlotSnap.data()
                ?.state
            ) &&
            newSlotSnap.data()
              ?.consultationId !==
              current.consultationId
          ) {

            throw new Error(
              "You already have another counseling session at this date and time. The transfer cannot be accepted until the schedule conflict is resolved."
            );
          }


          if (
            current.status !==
            "Pending approval"
          ) {
            throw new Error(
              "This transfer request has already been handled by another counselor."
            );
          }


          if (
            current.requestedById ===
            user.id
          ) {
            throw new Error(
              "The requesting counselor cannot approve their own transfer request."
            );
          }


          transaction.update(
            transferRef,
            {
              status:
                "Approved",

              acceptedById:
                user.id,

              acceptedByName:
                user.name ||
                "Guidance Counselor",

              acceptedByDepartment:
                user.department ||
                "",

              approvedAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp()
            }
          );


          transaction.set(
            accessRef,
            {
              ownerId:
                current.ownerId,

              ownerName:
                current.ownerName ||
                "",

              ownerDepartment:
                current.ownerDepartment ||
                "",

              counselorId:
                user.id,

              counselorName:
                user.name ||
                "Guidance Counselor",

              counselorDepartment:
                user.department ||
                "",

              previousCounselorId:
                current.requestedById,

              previousCounselorName:
                current.requestedByName ||
                "",

              transferRequestId:
                transfer.id,

              consultationId:
                current.consultationId,

              active:
                true,

              createdAt:
                serverTimestamp()
            }
          );


          transaction.update(
            consultationRef,
            {
              assignedCounselorId:
                user.id,

              assignedCounselorName:
                user.name ||
                "Guidance Counselor",

              assignedCounselorDepartment:
                user.department ||
                "",

              transferStatus:
                "Approved",

              transferRequestId:
                transfer.id,

              transferredFromCounselorId:
                current.requestedById,

              transferredFromCounselorName:
                current.requestedByName ||
                "",

              transferredAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp()
            }
          );


          transaction.set(
            profileRef,
            {
              ownerId:
                current.ownerId,

              ownerName:
                current.ownerName ||
                "",

              department:
                current.ownerDepartment ||
                "",

              assignedCounselorId:
                user.id,

              assignedCounselorName:
                user.name ||
                "Guidance Counselor",

              assignedCounselorDepartment:
                user.department ||
                "",

              transferActive:
                true,

              transferRequestId:
                transfer.id,

              transferredFromCounselorId:
                current.requestedById,

              transferredFromCounselorName:
                current.requestedByName ||
                "",

              transferApprovedAt:
                serverTimestamp(),

              updatedById:
                user.id,

              updatedByName:
                user.name ||
                "Guidance Counselor",

              updatedAt:
                serverTimestamp()
            },
            {
              merge:
                true
            }
          );


          // Keep the account-level counselor assignment current.
          // This makes future counseling requests follow the
          // newly approved counselor as well.
          transaction.update(
            ownerUserRef,
            {
              assignedCounselorId:
                user.id,

              assignedCounselorName:
                user.name ||
                "Guidance Counselor",

              assignedCounselorDepartment:
                user.department ||
                "",

              currentTransferRequestId:
                transfer.id,

              counselorTransferredAt:
                serverTimestamp()
            }
          );


          if (
            oldSlotRef &&
            oldSlotSnap
              ?.exists() &&
            oldSlotSnap.data()
              ?.consultationId ===
              current.consultationId &&
            (
              !newSlotRef ||
              oldSlotRef.path !==
                newSlotRef.path
            )
          ) {

            transaction.delete(
              oldSlotRef
            );
          }


          if (newSlotRef) {

            transaction.set(
              newSlotRef,
              {
                counselorId:
                  user.id,

                date:
                  slotDate,

                time:
                  slotTime,

                consultationId:
                  current.consultationId,

                assignmentSourceConsultationId:
                  current.consultationId,

                state:
                  current.requestStatus ===
                    "Schedule for counseling"
                    ? "booked"
                    : "held",

                ...(
                  newSlotSnap
                    ?.exists()
                    ? {}
                    : {
                        createdAt:
                          serverTimestamp()
                      }
                ),

                updatedAt:
                  serverTimestamp()
              },
              {
                merge:
                  true
              }
            );
          }
        }
      );


      await Promise.allSettled([
        addRecord(
          "notifications",
          {
            ownerId:
              transfer.ownerId,

            title:
              "Counselor transfer approved",

            message:
              `${user.name || "A Guidance Counselor"} [${user.department || "college not provided"}] approved your counselor transfer and is now your assigned counselor. You can continue to view the counseling request and schedule in MindTrack.`,

            notificationType:
              "counselor_transfer_update",

            senderRole:
              "counselor",

            senderId:
              user.id,

            senderName:
              user.name ||
              "Guidance Counselor",

            targetPath:
              "/consultations",

            sourceType:
              "consultation",

            sourceId:
              transfer.consultationId,

            transferRequestId:
              transfer.id,

            read:
              false
          }
        ),

        addRecord(
          "notifications",
          {
            ownerId:
              transfer.requestedById,

            title:
              "Counselor transfer accepted",

            message:
              `${user.name || "Another counselor"} accepted the transfer for ${transfer.ownerName || "the user"}. You retain read-only access to the user's previous counseling and assessment records for documentation.`,

            notificationType:
              "transfer_status",

            senderRole:
              "counselor",

            senderId:
              user.id,

            senderName:
              user.name ||
              "Guidance Counselor",

            targetPath:
              "/dashboard",

            sourceType:
              "transfer",

            sourceId:
              transfer.id,

            read:
              false
          }
        )
      ]);


      alert(
        `Transfer approved. ${transfer.ownerName || "The user"} is now assigned to you. Their user information, counseling-request history, and assessment-case history are available to you.`
      );

    } catch (error) {

      console.error(
        "Unable to approve counselor transfer:",
        error
      );


      alert(
        error?.message ||
        "Unable to approve the counselor transfer."
      );

    } finally {

      setApprovingTransferId(
        ""
      );
    }
  }


  const ownAssessments =
    assessments;


  const ownConsultations =
    consultations;


  const departmentCases =
    assessments;


  if (
    [
      "counselor",
      "super_admin"
    ].includes(
      user.role
    )
  ) {

    const critical =
      departmentCases.filter(
        x =>
          x.priority ===
          "Critical"
      ).length;


    const high =
      departmentCases.filter(
        x =>
          x.priority ===
          "High"
      ).length;


    return (

      <>

        <PageTitle

          title={
            user.role ===
            "super_admin"

              ? "Super Admin Dashboard"

              : "Counselor Dashboard"
          }

          subtitle="Live case monitoring and counseling operations"

        />


        <div className="stat-grid">

          <Stat
            title="Total cases"
            value={
              departmentCases.length
            }
            icon={
              <ClipboardList />
            }
          />


          <Stat
            title="Critical"
            value={critical}
            icon={
              <AlertTriangle />
            }
            danger
          />


          <Stat
            title="High priority"
            value={high}
            icon={
              <Clock3 />
            }
            warning
          />


          <Stat
            title="Appointments"
            value={
              consultations.length
            }
            icon={
              <Calendar />
            }
          />

        </div>


        {isCounselor && (

          <section className="panel transfer-dashboard-panel">

            <div className="transfer-dashboard-heading">

              <div>

                <h2>
                  Counselor Transfer Center
                </h2>

                <p>
                  A transfer changes the user's assigned counselor only after another counselor approves it and only before the counseling start time.
                </p>

              </div>


              <span className="transfer-count-badge">
                {pendingTransferRequests.length}
              </span>

            </div>


            <div className="transfer-dashboard-section">

              <div className="transfer-dashboard-subheading">

                <h3>
                  Waiting for your approval
                </h3>

                <span>
                  {pendingTransferRequests.length}
                </span>

              </div>


              {pendingTransferRequests.length === 0

                ? (

                  <div className="transfer-empty-state">
                    No users are currently waiting for your transfer approval.
                  </div>

                )

                : (

                  <div className="transfer-request-grid">

                    {pendingTransferRequests.map(
                      transfer => {

                        const transferClosed =
                          transferRequestHasStarted(
                            transfer
                          );


                        return (

                          <article
                            className="transfer-request-card"
                            key={transfer.id}
                          >

                            <div>

                              <strong>
                                {transfer.ownerName || "User"}
                              </strong>

                              <p>
                                {transfer.ownerDepartment || "No college / office"}
                              </p>

                              <small>
                                Request status: {transfer.requestStatus || "Not recorded"}
                              </small>

                              <small>
                                Counseling start: {transfer.date || "No date"} · {transfer.time || "No time"}
                              </small>

                              <small>
                                Current counselor: {transfer.requestedByName || "Counselor"}
                              </small>

                              {transfer.reason && (
                                <small>
                                  Transfer reason: {transfer.reason}
                                </small>
                              )}

                              {transferClosed && (
                                <small className="transfer-deadline-warning">
                                  Transfer window closed because the counseling start time has passed.
                                </small>
                              )}

                            </div>


                            <button
                              type="button"
                              className="primary-button"
                              disabled={
                                transferClosed ||
                                approvingTransferId ===
                                  transfer.id
                              }
                              onClick={
                                () =>
                                  approveTransfer(
                                    transfer
                                  )
                              }
                              title={
                                transferClosed
                                  ? "Transfers must be approved before counseling starts."
                                  : "Approve this transfer and become the assigned counselor."
                              }
                            >
                              {
                                transferClosed
                                  ? "Counseling already started"
                                  : approvingTransferId ===
                                      transfer.id
                                    ? "Approving..."
                                    : "Approve transfer"
                              }
                            </button>

                          </article>

                        );
                      }
                    )}

                  </div>

                )
              }

            </div>


            <div className="transfer-dashboard-section">

              <div className="transfer-dashboard-subheading">

                <h3>
                  Your outgoing transfers
                </h3>

                <span>
                  {outgoingTransferRequests.length}
                </span>

              </div>


              {outgoingTransferRequests.length === 0

                ? (

                  <div className="transfer-empty-state">
                    You have no counselor transfers waiting for another counselor.
                  </div>

                )

                : (

                  <div className="transfer-request-grid">

                    {outgoingTransferRequests.map(
                      transfer => {

                        const transferClosed =
                          transferRequestHasStarted(
                            transfer
                          );


                        return (

                          <article
                            className="transfer-request-card transfer-request-card-outgoing"
                            key={transfer.id}
                          >

                            <div>

                              <strong>
                                {transfer.ownerName || "User"}
                              </strong>

                              <p>
                                {transfer.ownerDepartment || "No college / office"}
                              </p>

                              <small>
                                Request status: {transfer.requestStatus || "Not recorded"}
                              </small>

                              <small>
                                Counseling start: {transfer.date || "No date"} · {transfer.time || "No time"}
                              </small>

                              {transfer.reason && (
                                <small>
                                  Transfer reason: {transfer.reason}
                                </small>
                              )}

                            </div>


                            <span
                              className={
                                transferClosed
                                  ? "transfer-deadline-label"
                                  : "transfer-pending-label"
                              }
                            >
                              {
                                transferClosed
                                  ? "Transfer window closed"
                                  : "Waiting for another counselor"
                              }
                            </span>

                          </article>

                        );
                      }
                    )}

                  </div>

                )
              }

            </div>

          </section>

        )}


        <section className="panel">

          <h2>
            Recent cases
          </h2>


          <CaseTable
            rows={
              departmentCases.slice(
                0,
                8
              )
            }
          />

        </section>

      </>

    );

  }


  return (

    <>

      <PageTitle

        title={
          `Welcome, ${user.name}`
        }

        subtitle="Access your MindTrack services and personal wellness tools."

      />


      <section className="panel">

        <h2>
          Quick Actions
        </h2>


        <div className="action-grid">

          <ActionLink
            href="/assessment"
            title="Assessment"
            text="Complete your guided psychological screening."
            icon={ClipboardList}
          />


          <ActionLink
            href="/consultations"
            title="Counseling"
            text="Request counseling and manage your submitted requests."
            icon={MessageCircle}
          />


          {employeeUserRole(
            user.role
          ) && (

            <ActionLink
              href="/referrals"
              title="Referrals"
              text="Refer a student or employee who may benefit from guidance support."
              icon={UserPlus}
            />

          )}


          <ActionLink
            href="/history"
            title="History"
            text="View your previous assessments and MindTrack activity."
            icon={Clock3}
          />


          <ActionLink
            href="/feedback"
            title="Ratings & Feedback"
            text="Rate your MindTrack experience and submit feedback."
            icon={Star}
          />


          <ActionLink
            href="/profile"
            title="Profile"
            text="View and update your personal contact information."
            icon={User}
          />

        </div>

      </section>

    </>

  );
}


// ======================================================
// ASSESSMENT
// ======================================================

function Assessment() {

  const { user } =
    useAuth();


  const [answers, setAnswers] =
    useState({});


  const [
    phq9Difficulty,
    setPhq9Difficulty
  ] = useState("");


  const [notes, setNotes] =
    useState("");


  const [saved, setSaved] =
    useState(null);


  const answeredAssessmentQuestions =
    scoredQuestionIds.filter(
      questionId =>
        answers[
          questionId
        ] !== undefined
    ).length;


  const totalAssessmentQuestions =
    scoredQuestionIds.length;


  const assessmentProgress =
    totalAssessmentQuestions > 0
      ? Math.round(
          (
            answeredAssessmentQuestions /
            totalAssessmentQuestions
          ) * 100
        )
      : 0;


  function answerQuestion(
    questionId,
    value
  ) {

    setAnswers(
      current => ({
        ...current,
        [questionId]:
          value
      })
    );
  }


  function phqDifficultyDisplay(
    option
  ) {

    const simpleMeanings = {

      "Not difficult at all":
        "I can still do my usual activities normally",

      "Somewhat difficult":
        "Some usual activities are harder",

      "Very difficult":
        "Many usual activities are hard",

      "Extremely difficult":
        "My usual activities are very hard to do"

    };


    return simpleMeanings[
      option
    ]
      ? `${option} — ${simpleMeanings[option]}`
      : option;
  }


  function renderInstrumentQuestions(
    questionsList,
    choicesList
  ) {

    return questionsList.map(
      (question, index) => (

        <div
          className="question"
          key={
            question.id
          }
        >

          <strong>

            {index + 1}.
            {" "}
            {question.text}

          </strong>


          <div
            className={
              choicesList.length > 4
                ? "choice-row assessment-choice-row-wide"
                : "choice-row"
            }
          >

            {choicesList.map(
              choice => (

                <label

                  key={
                    `${question.id}-${choice.value}`
                  }

                  className={
                    answers[
                      question.id
                    ] ===
                    choice.value

                      ? "choice selected"

                      : "choice"
                  }

                >

                  <input

                    type="radio"

                    name={
                      question.id
                    }

                    value={
                      choice.value
                    }

                    checked={
                      answers[
                        question.id
                      ] ===
                      choice.value
                    }

                    onChange={
                      () =>
                        answerQuestion(
                          question.id,
                          choice.value
                        )
                    }

                  />

                  <span className="assessment-choice-text">

                    <span className="assessment-choice-label">
                      {choice.label}
                    </span>


                    {choice.helper && (

                      <small className="assessment-choice-helper">
                        Simple meaning:
                        {" "}
                        {choice.helper}
                      </small>

                    )}

                  </span>

                </label>

              )
            )}

          </div>

        </div>

      )
    );
  }


  async function submit(e) {

    e.preventDefault();


    if (
      !GENDER_OPTIONS.includes(
        user.gender
      )
    ) {

      alert(
        "Please open Profile and select Male or Female before submitting a new assessment. This is required for the system analytics."
      );

      return;
    }


    const answeredScoredQuestions =
      scoredQuestionIds.filter(
        questionId =>
          answers[
            questionId
          ] !== undefined
      ).length;


    if (
      answeredScoredQuestions !==
      scoredQuestionIds.length
    ) {

      alert(
        "Please answer every WHO-5, PHQ-9, GAD-7, and DASS-21 question."
      );

      return;
    }


    const phqHasProblems =
      phq9Questions.some(
        question =>
          Number(
            answers[
              question.id
            ] ?? 0
          ) > 0
      );


    if (
      phqHasProblems &&
      !phq9Difficulty
    ) {

      alert(
        "Please answer the PHQ-9 difficulty question."
      );

      return;
    }


    const result =
      calculateAssessment(
        answers,
        phq9Difficulty
      );


    const record = {

      ownerId:
        user.id,

      ownerName:
        user.name,

      role:
        user.role,

      gender:
        normalizedGender(
          user.gender
        ),

      department:
        canonicalCollegeName(
          user.department
        ),

      program:
        user.program || "",

      assessmentVersion:
        "WHO5-PHQ9-GAD7-DASS21-SUBSCALES-2026-09",

      instrumentTitles: [
        WHO5_TITLE,
        PHQ9_TITLE,
        GAD7_TITLE,
        DASS21_TITLE
      ],

      answers,

      phq9Difficulty:
        phq9Difficulty ||
        "Not applicable",

      notes,

      ...result,

      status:
        "For review"

    };


    await addRecord(
      "assessments",
      record
    );


    setSaved(
      result
    );

  }


  if (saved) {

    return (

      <div className="result-card standardized-result-card">

        <CheckCircle2
          size={58}
        />


        <h1>
          Psychological assessment submitted
        </h1>


        <div
          className={
            `priority big ${saved.priority.toLowerCase()}`
          }
        >
          {saved.priority}
          {" "}
          monitoring priority
        </div>


        <div className="assessment-result-grid">

          <section className="assessment-result-item">

            <span>
              WHO-5
            </span>

            <strong>
              {
                saved.instrumentResults
                  .who5
                  .percentageScore
              }/100
            </strong>

            <small>
              Raw:
              {" "}
              {
                saved.instrumentResults
                  .who5
                  .rawScore
              }/25
            </small>

            <p>
              {
                saved.instrumentResults
                  .who5
                  .interpretation
              }
            </p>

          </section>


          <section className="assessment-result-item">

            <span>
              PHQ-9
            </span>

            <strong>
              {
                saved.instrumentResults
                  .phq9
                  .totalScore
              }/27
            </strong>

            <small>
              {
                saved.instrumentResults
                  .phq9
                  .severity
              }
              {" "}
              symptom range
            </small>

          </section>


          <section className="assessment-result-item">

            <span>
              GAD-7
            </span>

            <strong>
              {
                saved.instrumentResults
                  .gad7
                  .totalScore
              }/21
            </strong>

            <small>
              {
                saved.instrumentResults
                  .gad7
                  .severity
              }
              {" "}
              symptom range
            </small>

          </section>

          <section className="assessment-result-item dass21-subscale-card">

            <span>
              DASS-21 Depression
            </span>

            <strong>
              {
                saved.instrumentResults
                  .dass21
                  .depression
                  .adjustedScore
              }/42
            </strong>

            <small>
              Raw:
              {" "}
              {
                saved.instrumentResults
                  .dass21
                  .depression
                  .rawScore
              }/21
            </small>

            <p>
              Adjusted DASS-21 Depression score.
            </p>

          </section>


          <section className="assessment-result-item dass21-subscale-card">

            <span>
              DASS-21 Anxiety
            </span>

            <strong>
              {
                saved.instrumentResults
                  .dass21
                  .anxiety
                  .adjustedScore
              }/42
            </strong>

            <small>
              Raw:
              {" "}
              {
                saved.instrumentResults
                  .dass21
                  .anxiety
                  .rawScore
              }/21
            </small>

            <p>
              Adjusted DASS-21 Anxiety score.
            </p>

          </section>


          <section className="assessment-result-item dass21-subscale-card">

            <span>
              DASS-21 Stress
            </span>

            <strong>
              {
                saved.instrumentResults
                  .dass21
                  .stress
                  .adjustedScore
              }/42
            </strong>

            <small>
              Raw:
              {" "}
              {
                saved.instrumentResults
                  .dass21
                  .stress
                  .rawScore
              }/21
            </small>

            <p>
              Adjusted DASS-21 Stress score.
            </p>

          </section>

        </div>


        <p className="assessment-monitoring-recommendation">
          {saved.recommendation}
        </p>


        <div className="notice">

          WHO-5, PHQ-9, GAD-7, and DASS-21 are screening tools.
          These results do not provide a medical diagnosis.
          The MindTrack priority is an internal monitoring aid
          and is not an official category of the instruments.

        </div>


        {saved.safetyFlag && (

          <div className="critical-notice">

            Your PHQ-9 response indicates that a counselor should
            review the safety-related item promptly. If you are in
            immediate danger or may act on thoughts of self-harm,
            contact local emergency services or a trusted person nearby.

          </div>

        )}

      </div>

    );

  }


  return (

    <>

      <PageTitle

        title="Psychological Assessment"

        subtitle="Complete all four screening tools. Read each section carefully and choose the response that best matches your experience."

      />


      <div className="assessment-simple-guide">

        <strong>
          How to answer
        </strong>

        <p>
          Read each statement, think about the time period shown in that section,
          then choose the answer that best matches your experience.
          Each answer keeps the original response wording, with a simpler meaning
          shown underneath to make the choices easier to understand.
        </p>

      </div>


      <div
        className="assessment-progress-panel"
        aria-live="polite"
      >

        <div className="assessment-progress-header">

          <div>

            <strong>
              Assessment progress
            </strong>

            <span>
              {answeredAssessmentQuestions} of {totalAssessmentQuestions} questions answered
            </span>

          </div>


          <strong className="assessment-progress-percent">
            {assessmentProgress}%
          </strong>

        </div>


        <div
          className="assessment-progress-track"
          role="progressbar"
          aria-label="Assessment progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            assessmentProgress
          }
          aria-valuetext={
            `${answeredAssessmentQuestions} of ${totalAssessmentQuestions} questions answered`
          }
        >

          <div
            className="assessment-progress-fill"
            style={{
              width:
                `${assessmentProgress}%`
            }}
          />

        </div>

      </div>


      <form
        className="assessment-form standardized-assessment-form"
        onSubmit={submit}
      >


        <section className="panel assessment-instrument-card">

          <div className="assessment-instrument-heading">

            <div>

              <span className="assessment-instrument-code">
                WHO-5
              </span>

              <h2>
                {WHO5_TITLE}
              </h2>

            </div>

          </div>


          <p className="assessment-instructions">

            Think about the last two weeks. For each statement,
            choose the answer that is closest to how often you felt that way.

          </p>


          {
            renderInstrumentQuestions(
              who5Questions,
              who5Choices
            )
          }


          <div className="assessment-source-note">

            Source: World Health Organization. The World Health
            Organization-Five Well-Being Index (WHO-5), 2024.
            License: CC BY-NC-SA 3.0 IGO.

          </div>

        </section>


        <section className="panel assessment-instrument-card">

          <div className="assessment-instrument-heading">

            <div>

              <span className="assessment-instrument-code">
                PHQ-9
              </span>

              <h2>
                {PHQ9_TITLE}
              </h2>

            </div>

          </div>


          <p className="assessment-instructions">

            Think about the last 2 weeks. For each problem below,
            choose how often it bothered you.

          </p>


          {
            renderInstrumentQuestions(
              phq9Questions,
              phq9Choices
            )
          }


          <label className="assessment-difficulty-field">

            If you checked any problems, how difficult have these
            problems made it for you to do your work, take care of
            things at home, or get along with other people?

            <small className="assessment-field-helper">
              Choose the answer that best describes how much the problems
              affected your usual daily activities.
            </small>

            <select

              value={
                phq9Difficulty
              }

              onChange={
                event =>
                  setPhq9Difficulty(
                    event.target.value
                  )
              }

            >

              <option value="">
                Choose an answer
              </option>


              {phq9DifficultyChoices.map(
                option => (

                  <option
                    key={option}
                    value={option}
                  >
                    {
                      phqDifficultyDisplay(
                        option
                      )
                    }
                  </option>

                )
              )}

            </select>

          </label>


          <div className="assessment-source-note">

            The provided PHQ-9 form states that no permission is
            required to reproduce, translate, display, or distribute it.

          </div>

        </section>


        <section className="panel assessment-instrument-card">

          <div className="assessment-instrument-heading">

            <div>

              <span className="assessment-instrument-code">
                GAD-7
              </span>

              <h2>
                {GAD7_TITLE}
              </h2>

            </div>

          </div>


          <p className="assessment-instructions">

            Think about the last 2 weeks. For each problem below,
            choose how often it bothered you.

          </p>


          {
            renderInstrumentQuestions(
              gad7Questions,
              gad7Choices
            )
          }


          <div className="assessment-source-note">

            The provided GAD-7 form states that no permission is
            required to reproduce, translate, display, or distribute it.

          </div>

        </section>


        <section className="panel assessment-instrument-card">

          <div className="assessment-instrument-heading">

            <div>

              <span className="assessment-instrument-code">
                DASS-21
              </span>

              <h2>
                {DASS21_TITLE}
              </h2>

            </div>

          </div>


          <p className="assessment-instructions">

            Think about the past week. Read each statement and choose
            the answer that best shows how much it applied to you.

          </p>


          {
            renderInstrumentQuestions(
              dass21Questions,
              dass21Choices
            )
          }



        </section>


        <section className="panel assessment-final-section">

          <label>

            Additional notes
            {" "}

            <span className="optional-text">
              (Optional)
            </span>


            <textarea

              value={notes}

              onChange={
                e =>
                  setNotes(
                    e.target.value
                  )
              }

              rows="4"

              placeholder="Share information that may help the counselor understand your concern."

            />

          </label>


          <div className="notice">

            Please review your answers before submitting.
            MindTrack uses these tools for screening and monitoring
            support only. Results are not a diagnosis.

          </div>


          <button className="primary-button">

            Submit psychological assessment

          </button>

        </section>


      </form>

    </>

  );
}


// ======================================================
// COUNSELING DATE AND TIME AVAILABILITY
// ======================================================

const COUNSELING_TIME_SLOTS = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM"
];


function counselingSlotDocumentId(
  counselorId,
  date,
  time
) {

  return [
    String(
      counselorId || ""
    ).trim(),

    String(
      date || ""
    ).trim(),

    String(
      time || ""
    ).trim()
  ].join("__");
}


function activeCounselingSlotState(
  value
) {

  return [
    "held",
    "booked"
  ].includes(
    String(
      value || ""
    ).trim()
  );
}



const COUNSELING_REQUEST_RELEASE_STATUSES = [
  "Follow up is recommended",
  "Concluded"
];


const COUNSELING_REVIEW_STATUSES = [
  "For review",
  "Schedule for counseling",
  "Follow up is recommended",
  "Counseling is optional",
  "For referral",
  "Concluded"
];


function counselingRequestAllowsAnother(
  status
) {

  return COUNSELING_REQUEST_RELEASE_STATUSES.includes(
    String(
      status || ""
    ).trim()
  );
}


function counselingRequestIsActive(
  row
) {

  return Boolean(
    row &&
    !counselingRequestAllowsAnother(
      row.status
    )
  );
}


function counselorProgramLabel(
  value
) {

  const cleanValue =
    String(
      value || ""
    ).trim();


  return cleanValue ||
    "Not provided";
}


function counselorCollegeLabel(
  value
) {

  const cleanValue =
    String(
      value || ""
    ).trim();


  return cleanValue ||
    "Not provided";
}


function assessmentCaseStatusLabel(
  value
) {

  const status =
    String(
      value || ""
    ).trim();


  if (
    status ===
    "Schedule for counseling"
  ) {

    return "Counseling is recommended";
  }


  if (
    status ===
    "For referral"
  ) {

    return "Approved";
  }


  return status ||
    "For review";
}


function isCounselorReviewedAssessment(
  row
) {

  return Boolean(
    row &&
    row.reviewed === true &&
    row.reviewedByRole ===
      "counselor" &&
    assessmentCaseStatusLabel(
      row.status
    ) !== "For review"
  );
}


function assessmentTrendMetrics(
  row
) {

  const results =
    row?.instrumentResults;


  if (!results) {
    return [];
  }


  const metrics = [];


  function addMetric(
    key,
    label,
    value,
    higherIsBetter
  ) {

    const numericValue =
      Number(value);


    if (
      Number.isFinite(
        numericValue
      )
    ) {

      metrics.push({
        key,
        label,
        value:
          numericValue,
        higherIsBetter
      });
    }
  }


  addMetric(
    "who5",
    "WHO-5",
    results?.who5
      ?.percentageScore,
    true
  );


  addMetric(
    "phq9",
    "PHQ-9",
    results?.phq9
      ?.totalScore,
    false
  );


  addMetric(
    "gad7",
    "GAD-7",
    results?.gad7
      ?.totalScore,
    false
  );


  if (
    results?.dass21
      ?.depression
  ) {

    addMetric(
      "dass_depression",
      "DASS-21 Depression",
      results.dass21
        .depression
        .adjustedScore,
      false
    );


    addMetric(
      "dass_anxiety",
      "DASS-21 Anxiety",
      results.dass21
        .anxiety
        .adjustedScore,
      false
    );


    addMetric(
      "dass_stress",
      "DASS-21 Stress",
      results.dass21
        .stress
        .adjustedScore,
      false
    );

  } else {

    addMetric(
      "dass_total",
      "DASS-21 Legacy Total",
      results?.dass21
        ?.totalScore,
      false
    );
  }


  return metrics;
}


function compareReviewedAssessmentTrend(
  current,
  previous
) {

  if (
    !current ||
    !previous
  ) {

    return {
      key:
        "insufficient",

      label:
        "Not enough reviewed assessments",

      summary:
        "At least two counselor-reviewed assessments are needed to determine whether the monitoring trend is improving.",

      improved:
        0,

      worsened:
        0,

      unchanged:
        0,

      compared:
        0
    };
  }


  const currentMetrics =
    assessmentTrendMetrics(
      current
    );


  const previousMap =
    new Map(
      assessmentTrendMetrics(
        previous
      ).map(
        metric => [
          metric.key,
          metric
        ]
      )
    );


  let improved = 0;
  let worsened = 0;
  let unchanged = 0;


  currentMetrics.forEach(
    metric => {

      const previousMetric =
        previousMap.get(
          metric.key
        );


      if (!previousMetric) {
        return;
      }


      if (
        metric.value ===
        previousMetric.value
      ) {

        unchanged += 1;
        return;
      }


      const isImprovement =
        metric.higherIsBetter
          ? metric.value >
            previousMetric.value
          : metric.value <
            previousMetric.value;


      if (isImprovement) {

        improved += 1;

      } else {

        worsened += 1;
      }
    }
  );


  const compared =
    improved +
    worsened +
    unchanged;


  if (compared === 0) {

    return {
      key:
        "insufficient",

      label:
        "Not enough comparable results",

      summary:
        "The two reviewed assessments do not contain enough matching scores to determine a monitoring trend.",

      improved,
      worsened,
      unchanged,
      compared
    };
  }


  if (
    improved >
    worsened
  ) {

    return {
      key:
        "improving",

      label:
        "Improving",

      summary:
        `${improved} of ${compared} comparable indicators improved, ${worsened} moved in a less favorable direction, and ${unchanged} stayed the same.`,

      improved,
      worsened,
      unchanged,
      compared
    };
  }


  if (
    worsened >
    improved
  ) {

    return {
      key:
        "not-improving",

      label:
        "Not improving",

      summary:
        `${worsened} of ${compared} comparable indicators moved in a less favorable direction, ${improved} improved, and ${unchanged} stayed the same.`,

      improved,
      worsened,
      unchanged,
      compared
    };
  }


  return {
    key:
      "no-clear-change",

    label:
      "No clear change",

    summary:
      `${improved} of ${compared} comparable indicators improved, ${worsened} moved in a less favorable direction, and ${unchanged} stayed the same.`,

    improved,
    worsened,
    unchanged,
    compared
  };
}


function priorityClassName(
  priority
) {

  const cleanPriority =
    String(
      priority || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        "-"
      );


  return `priority ${
    cleanPriority ||
    "no-assessment"
  }`;
}


function counselingTimeMinutes(
  timeText
) {

  const match =
    String(
      timeText || ""
    )
      .trim()
      .match(
        /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
      );


  if (!match) {

    return 24 * 60;
  }


  let hour =
    Number(
      match[1]
    );


  const minute =
    Number(
      match[2]
    );


  const period =
    match[3]
      .toUpperCase();


  if (
    period === "AM" &&
    hour === 12
  ) {

    hour = 0;
  }


  if (
    period === "PM" &&
    hour !== 12
  ) {

    hour += 12;
  }


  return (
    hour * 60 +
    minute
  );
}


function counselingAppointmentSortValue(
  row
) {

  const dateText =
    String(
      row?.date || ""
    ).trim();


  if (!dateText) {

    return Number.MAX_SAFE_INTEGER;
  }


  const dateValue =
    new Date(
      `${dateText}T00:00:00`
    ).getTime();


  if (
    Number.isNaN(
      dateValue
    )
  ) {

    return Number.MAX_SAFE_INTEGER;
  }


  return (
    dateValue +
    counselingTimeMinutes(
      row?.time
    ) *
      60 *
      1000
  );
}


function recordDateObject(
  value
) {

  if (!value) {
    return null;
  }


  if (
    typeof value.toDate ===
    "function"
  ) {

    return value.toDate();
  }


  if (
    typeof value.seconds ===
    "number"
  ) {

    return new Date(
      value.seconds * 1000
    );
  }


  if (
    value instanceof Date
  ) {

    return value;
  }


  const parsed =
    new Date(value);


  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}


function formatRecordDateTime(
  value
) {

  const date =
    recordDateObject(value);


  if (!date) {
    return "Date not available";
  }


  return date.toLocaleString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  );
}


function teachingUserRole(
  role
) {

  return [
    "teaching",
    "faculty"
  ].includes(role);
}


function nonTeachingUserRole(
  role
) {

  return [
    "non_teaching",
    "personnel"
  ].includes(role);
}


function employeeUserRole(
  role
) {

  return (
    teachingUserRole(role) ||
    nonTeachingUserRole(role)
  );
}


function generalUserRole(
  role
) {

  return (
    role === "student" ||
    employeeUserRole(role)
  );
}


function generalUserRoleLabel(
  role
) {

  if (role === "student") {
    return "Student";
  }

  if (teachingUserRole(role)) {
    return "Teaching";
  }

  if (nonTeachingUserRole(role)) {
    return "Non-teaching";
  }

  if (role === "counselor") {
    return "Guidance Counselor";
  }

  if (role === "super_admin") {
    return "Super Admin";
  }

  return role || "—";
}


// National regular and special non-working holidays.
// 2026 dates follow Proclamation No. 1006 plus the
// separately declared Eid'l Fitr and Eid'l Adha holidays.
// 2027 dates follow Proclamation No. 1427.
// Eid holidays for 2027 can be added here once officially declared.
const COUNSELING_HOLIDAYS = {
  "2026-01-01": "New Year's Day",
  "2026-02-17": "Chinese New Year",
  "2026-03-20": "Eid'l Fitr",
  "2026-04-02": "Maundy Thursday",
  "2026-04-03": "Good Friday",
  "2026-04-04": "Black Saturday",
  "2026-04-09": "Araw ng Kagitingan",
  "2026-05-01": "Labor Day",
  "2026-05-27": "Eid'l Adha",
  "2026-06-12": "Independence Day",
  "2026-08-21": "Ninoy Aquino Day",
  "2026-08-31": "National Heroes Day",
  "2026-11-01": "All Saints' Day",
  "2026-11-02": "All Souls' Day",
  "2026-11-30": "Bonifacio Day",
  "2026-12-08": "Feast of the Immaculate Conception of Mary",
  "2026-12-24": "Christmas Eve",
  "2026-12-25": "Christmas Day",
  "2026-12-30": "Rizal Day",
  "2026-12-31": "Last Day of the Year",

  "2027-01-01": "New Year's Day",
  "2027-02-06": "Chinese New Year",
  "2027-03-25": "Maundy Thursday",
  "2027-03-26": "Good Friday",
  "2027-03-27": "Black Saturday",
  "2027-04-09": "Araw ng Kagitingan",
  "2027-05-01": "Labor Day",
  "2027-06-12": "Independence Day",
  "2027-08-21": "Ninoy Aquino Day",
  "2027-08-30": "National Heroes Day",
  "2027-11-01": "All Saints' Day",
  "2027-11-02": "All Souls' Day",
  "2027-11-30": "Bonifacio Day",
  "2027-12-08": "Feast of the Immaculate Conception of Mary",
  "2027-12-24": "Christmas Eve",
  "2027-12-25": "Christmas Day",
  "2027-12-30": "Rizal Day",
  "2027-12-31": "Last Day of the Year"
};


// Convert a local Date object to YYYY-MM-DD without UTC shifting.
function localDateKey(date) {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");


  return `${year}-${month}-${day}`;
}


function todayDateKey() {

  return localDateKey(
    new Date()
  );
}


function isPastCounselingDate(dateKey) {

  return Boolean(
    dateKey &&
    dateKey < todayDateKey()
  );
}


function counselingHolidayName(dateKey) {

  return (
    COUNSELING_HOLIDAYS[
      dateKey
    ] || ""
  );
}


function isWeekendCounselingDate(dateKey) {

  if (!dateKey) {
    return false;
  }


  const date =
    new Date(
      `${dateKey}T00:00:00`
    );


  const day =
    date.getDay();


  return (
    day === 0 ||
    day === 6
  );
}


function isUnavailableCounselingDate(dateKey) {

  return (
    isPastCounselingDate(
      dateKey
    ) ||
    isWeekendCounselingDate(
      dateKey
    ) ||
    Boolean(
      counselingHolidayName(
        dateKey
      )
    )
  );
}


function CounselingDatePicker({
  value,
  onChange
}) {

  const initialDate =
    value
      ? new Date(
          `${value}T00:00:00`
        )
      : new Date();


  const [
    visibleMonth,
    setVisibleMonth
  ] = useState(
    new Date(
      initialDate.getFullYear(),
      initialDate.getMonth(),
      1
    )
  );


  const year =
    visibleMonth.getFullYear();

  const month =
    visibleMonth.getMonth();


  const firstWeekday =
    new Date(
      year,
      month,
      1
    ).getDay();


  const numberOfDays =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  const monthName =
    visibleMonth.toLocaleDateString(
      "en-PH",
      {
        month: "long",
        year: "numeric"
      }
    );


  const calendarCells = [];


  for (
    let blank = 0;
    blank < firstWeekday;
    blank += 1
  ) {

    calendarCells.push(
      <div
        key={`blank-${blank}`}
        className="counseling-calendar-empty"
      />
    );
  }


  for (
    let day = 1;
    day <= numberOfDays;
    day += 1
  ) {

    const date =
      new Date(
        year,
        month,
        day
      );


    const dateKey =
      localDateKey(
        date
      );


    const holidayName =
      counselingHolidayName(
        dateKey
      );


    const past =
      isPastCounselingDate(
        dateKey
      );


    const weekend =
      isWeekendCounselingDate(
        dateKey
      );


    const unavailable =
      past ||
      weekend ||
      Boolean(
        holidayName
      );


    const selected =
      value ===
      dateKey;


    calendarCells.push(

      <button

        key={dateKey}

        type="button"

        className={[
          "counseling-calendar-day",
          past
            ? "past"
            : "",
          weekend && !past
            ? "weekend"
            : "",
          holidayName
            ? "holiday"
            : "",
          selected
            ? "selected"
            : ""
        ]
          .filter(Boolean)
          .join(" ")}

        disabled={
          unavailable
        }

        title={
          holidayName
            ? `${holidayName} — unavailable`
            : past
              ? "Past date — unavailable"
              : weekend
                ? "Weekend — unavailable"
                : "Available"
        }

        onClick={
          () =>
            onChange(
              dateKey
            )
        }

      >

        <span className="calendar-day-number">
          {day}
        </span>


        {holidayName && (

          <span className="calendar-day-marker">
            Holiday
          </span>

        )}

      </button>

    );
  }


  const holidaysThisMonth =
    Object.entries(
      COUNSELING_HOLIDAYS
    )
      .filter(
        ([dateKey]) => {

          const date =
            new Date(
              `${dateKey}T00:00:00`
            );


          return (
            date.getFullYear() ===
              year &&
            date.getMonth() ===
              month
          );
        }
      )
      .sort(
        ([dateA], [dateB]) =>
          dateA.localeCompare(
            dateB
          )
      );


  const currentMonthStart =
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );


  const previousMonth =
    new Date(
      year,
      month - 1,
      1
    );


  const previousDisabled =
    previousMonth <
    currentMonthStart;


  return (

    <div className="counseling-date-picker">

      <div className="counseling-calendar-header">

        <button
          type="button"
          className="calendar-nav-button"
          disabled={
            previousDisabled
          }
          onClick={
            () =>
              setVisibleMonth(
                previousMonth
              )
          }
        >
          ‹
        </button>


        <strong>
          {monthName}
        </strong>


        <button
          type="button"
          className="calendar-nav-button"
          onClick={
            () =>
              setVisibleMonth(
                new Date(
                  year,
                  month + 1,
                  1
                )
              )
          }
        >
          ›
        </button>

      </div>


      <div className="counseling-calendar-weekdays">

        {[
          "Sun",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat"
        ].map(
          weekday => (
            <span key={weekday}>
              {weekday}
            </span>
          )
        )}

      </div>


      <div className="counseling-calendar-grid">
        {calendarCells}
      </div>


      {value && (

        <div className="selected-counseling-date">

          Selected date:
          {" "}

          <strong>
            {
              new Date(
                `${value}T00:00:00`
              ).toLocaleDateString(
                "en-PH",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                }
              )
            }
          </strong>

        </div>

      )}


      {holidaysThisMonth.length > 0 && (

        <div className="calendar-holiday-list">

          <strong>
            Marked holidays this month
          </strong>


          {holidaysThisMonth.map(
            ([dateKey, name]) => (

              <div
                key={dateKey}
                className="calendar-holiday-row"
              >

                <span>
                  {
                    new Date(
                      `${dateKey}T00:00:00`
                    ).toLocaleDateString(
                      "en-PH",
                      {
                        month: "short",
                        day: "numeric"
                      }
                    )
                  }
                </span>

                <span>
                  {name}
                </span>

              </div>

            )
          )}

        </div>

      )}


    </div>

  );
}


// ======================================================
// CONSULTATIONS
// ======================================================

function Consultations() {

  const { user } =
    useAuth();


  const location =
    useLocation();


  const navigate =
    useNavigate();


  const rows =
    useRows(
      "consultations",
      {
        ownerId:
          user.id
      }
    );


  const activeCounselingRequests =
    rows.filter(
      counselingRequestIsActive
    );


  const blockingCounselingRequest =
    activeCounselingRequests[0] ||
    null;


  // Use the most recent counseling request that contains an
  // assigned counselor as the current source. For newly registered
  // Teaching / Non-teaching accounts, fall back to the counselor
  // selected during registration until a counseling request exists.
  // This avoids exposing private counselingProfiles notes to users.
  const currentCounselorAssignment =
    rows.find(
      row =>
        Boolean(
          row.assignedCounselorId
        )
    ) ||
    null;


  const currentAssignedCounselorId =
    currentCounselorAssignment
      ?.assignedCounselorId ||
    user.assignedCounselorId ||
    "";


  const currentAssignedCounselorName =
    currentCounselorAssignment
      ?.assignedCounselorName ||
    user.assignedCounselorName ||
    "";


  const currentAssignedCounselorDepartment =
    currentCounselorAssignment
      ?.assignedCounselorDepartment ||
    user.assignedCounselorDepartment ||
    "";


  const counselorScheduleSlots =
    useRows(
      "counselingScheduleSlots",
      currentAssignedCounselorId
        ? {
            counselorId:
              currentAssignedCounselorId
          }
        : {
            counselorId:
              "__NO_ASSIGNED_COUNSELOR__"
          }
    );


  function counselingTimeUnavailable(
    date,
    time,
    ignoreConsultationId = ""
  ) {

    if (
      !currentAssignedCounselorId ||
      !date ||
      !time
    ) {

      return false;
    }


    return counselorScheduleSlots.some(
      slot =>
        slot.counselorId ===
          currentAssignedCounselorId &&
        slot.date ===
          date &&
        slot.time ===
          time &&
        activeCounselingSlotState(
          slot.state
        ) &&
        slot.consultationId !==
          ignoreConsultationId
    );
  }


  const counselingConcernOptions =
    employeeUserRole(
      user.role
    )
      ? [
          "Anxiety or stress",
          "Family concern",
          "Workplace concern",
          "Financial concern",
          "Other"
        ]
      : [
          "Academic concern",
          "Anxiety or stress",
          "Family concern",
          "Workplace concern",
          "Financial concern",
          "Other"
        ];


  const defaultCounselingConcern =
    counselingConcernOptions[0];


  const emptyRequest = {
    mode:
      "",

    date:
      "",

    time:
      "",

    category:
      defaultCounselingConcern,

    message:
      ""
  };


  const [form, setForm] =
    useState(
      emptyRequest
    );


  const [
    editingId,
    setEditingId
  ] = useState(null);


  const [
    editForm,
    setEditForm
  ] = useState(null);


  const [
    savingEdit,
    setSavingEdit
  ] = useState(false);


  const requestedRequestId =
    location.state
      ?.requestId ||
    "";


  useEffect(
    () => {

      if (
        !requestedRequestId ||
        rows.length === 0
      ) {

        return;
      }


      const targetExists =
        rows.some(
          row =>
            row.id ===
            requestedRequestId
        );


      if (!targetExists) {
        return;
      }


      const timer =
        window.setTimeout(
          () => {

            const element =
              document.getElementById(
                `consultation-${requestedRequestId}`
              );


            element?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "center"
            });
          },
          120
        );


      return () =>
        window.clearTimeout(
          timer
        );

    },

    [
      requestedRequestId,
      rows
    ]
  );


  function clearNotificationNavigation() {

    if (
      location.state
        ?.fromNotification
    ) {

      navigate(
        location.pathname,
        {
          replace: true,
          state: {}
        }
      );
    }
  }


  function validateRequestDate(
    date
  ) {

    if (!date) {

      return (
        "Please select an available counseling date."
      );
    }


    if (
      isPastCounselingDate(
        date
      )
    ) {

      return (
        "Past dates cannot be selected for counseling."
      );
    }


    if (
      isWeekendCounselingDate(
        date
      )
    ) {

      return (
        "Weekends are unavailable for counseling. Please choose a weekday."
      );
    }


    const holidayName =
      counselingHolidayName(
        date
      );


    if (holidayName) {

      return (
        `${holidayName} is a holiday and is unavailable for counseling. Please choose another date.`
      );
    }


    return "";
  }


  function formattedRequestDate(
    date
  ) {

    if (!date) {
      return "No date selected";
    }


    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-PH",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      }
    );
  }


  async function submit(e) {

    e.preventDefault();


    if (
      blockingCounselingRequest
    ) {

      alert(
        `You already have an active counseling request with status "${blockingCounselingRequest.status || "Pending approval"}". You may submit another request only after your counselor changes the current request to "Follow up is recommended" or "Concluded".`
      );

      return;
    }


    if (
      !GENDER_OPTIONS.includes(
        user.gender
      )
    ) {

      alert(
        "Please open Profile and select Male or Female before submitting a counseling request. This is required for the system analytics."
      );

      return;
    }


    if (!form.mode) {

      alert(
        "Please select the counseling mode."
      );

      return;
    }


    const dateError =
      validateRequestDate(
        form.date
      );


    if (dateError) {

      alert(dateError);

      return;
    }


    if (
      !form.time ||
      !COUNSELING_TIME_SLOTS.includes(
        form.time
      )
    ) {

      alert(
        "Please select a valid preferred counseling time."
      );

      return;
    }


    if (
      counselingTimeUnavailable(
        form.date,
        form.time
      )
    ) {

      alert(
        "That counseling time is no longer available for your assigned counselor. Please choose another time."
      );

      return;
    }


    const confirmed =
      window.confirm(
        [
          "Are you sure you want to submit this counseling request?",
          "",
          `Concern: ${form.category}`,
          `Mode: ${form.mode}`,
          `Date: ${formattedRequestDate(form.date)}`,
          `Time: ${form.time}`
        ].join("\n")
      );


    if (!confirmed) {
      return;
    }


    try {

      const consultationRef =
        doc(
          collection(
            db,
            "consultations"
          )
        );


      const requestGuardRef =
        doc(
          db,
          "counselingRequestGuards",
          user.id
        );


      const slotRef =
        currentAssignedCounselorId
          ? doc(
              db,
              "counselingScheduleSlots",
              counselingSlotDocumentId(
                currentAssignedCounselorId,
                form.date,
                form.time
              )
            )
          : null;


      await runTransaction(
        db,

        async transaction => {

          const requestGuardSnap =
            await transaction.get(
              requestGuardRef
            );


          const guardedActiveRequestIds =
            requestGuardSnap.exists() &&
            Array.isArray(
              requestGuardSnap.data()
                ?.activeRequestIds
            )
              ? requestGuardSnap.data()
                  .activeRequestIds
                  .filter(Boolean)
              : [];


          if (
            guardedActiveRequestIds.length >
            0
          ) {

            throw new Error(
              "You already have an active counseling request. You may submit another only after the current request is marked Follow up is recommended or Concluded."
            );
          }


          let slotSnap =
            null;


          if (slotRef) {

            slotSnap =
              await transaction.get(
                slotRef
              );


            if (
              slotSnap.exists() &&
              activeCounselingSlotState(
                slotSnap.data()
                  ?.state
              )
            ) {

              throw new Error(
                "That counseling time was just selected by another user. Please choose another time."
              );
            }
          }


          transaction.set(
            consultationRef,
            {

              ...form,

              ownerId:
                user.id,

              ownerName:
                user.name,

              role:
                user.role,

              gender:
                normalizedGender(
                  user.gender
                ),

              department:
                canonicalCollegeName(
                  user.department
                ),

              program:
                user.program ||
                "",

              ...(currentAssignedCounselorId
                ? {
                    assignedCounselorId:
                      currentAssignedCounselorId,

                    assignedCounselorName:
                      currentAssignedCounselorName,

                    assignedCounselorDepartment:
                      currentAssignedCounselorDepartment
                  }
                : {}),

              status:
                "Pending approval",

              source:
                "Self-request",

              createdAt:
                serverTimestamp()
            }
          );


          transaction.set(
            requestGuardRef,
            {
              ownerId:
                user.id,

              activeRequestIds: [
                consultationRef.id
              ],

              activeRequestCount:
                1,

              latestRequestId:
                consultationRef.id,

              latestStatus:
                "Pending approval",

              updatedById:
                user.id,

              updatedAt:
                serverTimestamp()
            },
            {
              merge:
                true
            }
          );


          if (slotRef) {

            transaction.set(
              slotRef,
              {
                counselorId:
                  currentAssignedCounselorId,

                date:
                  form.date,

                time:
                  form.time,

                consultationId:
                  consultationRef.id,

                assignmentSourceConsultationId:
                  currentCounselorAssignment
                    ?.id ||
                  "",

                state:
                  "held",

                createdAt:
                  serverTimestamp(),

                updatedAt:
                  serverTimestamp()
              }
            );
          }
        }
      );


      setForm({
        ...emptyRequest
      });


      alert(
        "Your counseling request was submitted successfully."
      );

    } catch (err) {

      console.error(
        "Counseling request error:",
        err
      );


      alert(
        err?.message ||
        "Unable to submit your counseling request."
      );
    }
  }


  function startEdit(row) {

    setEditingId(
      row.id
    );


    setEditForm({

      mode:
        row.mode ||
        "",

      date:
        row.date ||
        "",

      time:
        COUNSELING_TIME_SLOTS.includes(
          row.time
        )
          ? row.time
          : "",

      category:
        counselingConcernOptions.includes(
          row.category
        )
          ? row.category
          : defaultCounselingConcern,

      message:
        row.message ||
        ""

    });
  }


  function cancelEdit() {

    setEditingId(null);
    setEditForm(null);
  }


  async function saveEdit(
    e,
    row
  ) {

    e.preventDefault();


    if (!editForm) {
      return;
    }


    if (!editForm.mode) {

      alert(
        "Please select the counseling mode."
      );

      return;
    }


    const dateError =
      validateRequestDate(
        editForm.date
      );


    if (dateError) {

      alert(dateError);

      return;
    }


    if (
      !editForm.time ||
      !COUNSELING_TIME_SLOTS.includes(
        editForm.time
      )
    ) {

      alert(
        "Please select a valid preferred counseling time."
      );

      return;
    }


    const editCounselorId =
      row.assignedCounselorId ||
      currentAssignedCounselorId;


    if (
      editCounselorId &&
      counselorScheduleSlots.some(
        slot =>
          slot.counselorId ===
            editCounselorId &&
          slot.date ===
            editForm.date &&
          slot.time ===
            editForm.time &&
          activeCounselingSlotState(
            slot.state
          ) &&
          slot.consultationId !==
            row.id
      )
    ) {

      alert(
        "That counseling time is no longer available for the assigned counselor. Please choose another time."
      );

      return;
    }


    const confirmed =
      window.confirm(
        [
          "Are you sure you want to save these changes?",
          "",
          `Concern: ${editForm.category}`,
          `Mode: ${editForm.mode}`,
          `Date: ${formattedRequestDate(editForm.date)}`,
          `Time: ${editForm.time}`,
          "",
          "The request will return to Pending approval so the counselor can review the changes."
        ].join("\n")
      );


    if (!confirmed) {
      return;
    }


    try {

      setSavingEdit(true);


      const consultationRef =
        doc(
          db,
          "consultations",
          row.id
        );


      const editCounselorId =
        row.assignedCounselorId ||
        currentAssignedCounselorId;


      const editCounselorName =
        row.assignedCounselorName ||
        currentAssignedCounselorName;


      const editCounselorDepartment =
        row.assignedCounselorDepartment ||
        currentAssignedCounselorDepartment;


      const assignmentSourceConsultationId =
        row.assignedCounselorId
          ? row.id
          : (
              currentCounselorAssignment
                ?.id ||
              ""
            );


      const oldSlotRef =
        editCounselorId &&
        row.date &&
        row.time
          ? doc(
              db,
              "counselingScheduleSlots",
              counselingSlotDocumentId(
                editCounselorId,
                row.date,
                row.time
              )
            )
          : null;


      const newSlotRef =
        editCounselorId
          ? doc(
              db,
              "counselingScheduleSlots",
              counselingSlotDocumentId(
                editCounselorId,
                editForm.date,
                editForm.time
              )
            )
          : null;


      await runTransaction(
        db,

        async transaction => {

          let oldSlotSnap =
            null;

          let newSlotSnap =
            null;


          if (
            oldSlotRef &&
            newSlotRef &&
            oldSlotRef.path ===
              newSlotRef.path
          ) {

            newSlotSnap =
              await transaction.get(
                newSlotRef
              );

            oldSlotSnap =
              newSlotSnap;

          } else {

            if (oldSlotRef) {

              oldSlotSnap =
                await transaction.get(
                  oldSlotRef
                );
            }


            if (newSlotRef) {

              newSlotSnap =
                await transaction.get(
                  newSlotRef
                );
            }
          }


          if (
            newSlotSnap
              ?.exists() &&
            activeCounselingSlotState(
              newSlotSnap.data()
                ?.state
            ) &&
            newSlotSnap.data()
              ?.consultationId !==
              row.id
          ) {

            throw new Error(
              "That counseling time was just selected by another user. Please choose another time."
            );
          }


          transaction.update(
            consultationRef,
            {
              mode:
                editForm.mode,

              date:
                editForm.date,

              time:
                editForm.time,

              category:
                editForm.category,

              message:
                editForm.message,

              status:
                "Pending approval",

              updatedAt:
                serverTimestamp()
            }
          );


          if (
            oldSlotRef &&
            newSlotRef &&
            oldSlotRef.path !==
              newSlotRef.path &&
            oldSlotSnap
              ?.exists() &&
            oldSlotSnap.data()
              ?.consultationId ===
              row.id
          ) {

            transaction.delete(
              oldSlotRef
            );
          }


          if (newSlotRef) {

            transaction.set(
              newSlotRef,
              {
                counselorId:
                  editCounselorId,

                date:
                  editForm.date,

                time:
                  editForm.time,

                consultationId:
                  row.id,

                assignmentSourceConsultationId,

                state:
                  "held",

                ...(
                  newSlotSnap
                    ?.exists()
                    ? {}
                    : {
                        createdAt:
                          serverTimestamp()
                      }
                ),

                updatedAt:
                  serverTimestamp()
              },
              {
                merge:
                  true
              }
            );
          }
        }
      );


      setEditingId(null);
      setEditForm(null);


      alert(
        "Your counseling request was updated successfully."
      );

    } catch (err) {

      console.error(
        "Counseling request update error:",
        err
      );


      alert(
        err?.message ||
        "Unable to update your counseling request."
      );

    } finally {

      setSavingEdit(false);

    }
  }


  return (

    <>

      <PageTitle

        title="Counseling Requests"

        subtitle="Request counseling and track approval or rescheduling in real time."

      />


      <div className="two-column">


        <form
          className="panel"
          onSubmit={submit}
        >

          <h2>
            New request
          </h2>


          {blockingCounselingRequest && (

            <div className="notice counseling-request-limit-notice">

              <strong>
                You already have an active counseling request.
              </strong>

              <span>
                Current status:
                {" "}
                <b>
                  {
                    blockingCounselingRequest.status ||
                    "Pending approval"
                  }
                </b>
                .
                {" "}
                You can submit another request only when your counselor marks this request
                {" "}
                <b>
                  Follow up is recommended
                </b>
                {" "}
                or
                {" "}
                <b>
                  Concluded
                </b>
                .
              </span>

            </div>

          )}


          <fieldset
            className="counseling-new-request-fieldset"
            disabled={
              Boolean(
                blockingCounselingRequest
              )
            }
          >


          <label>

            Mode

            <select

              value={
                form.mode
              }

              required

              onChange={
                e =>
                  setForm({
                    ...form,
                    mode:
                      e.target.value
                  })
              }

            >

              <option value="">
                Choose counseling mode
              </option>

              <option value="Face-to-face">
                Face-to-face
              </option>

            </select>

          </label>


          <div className="counseling-date-field">

            <label>
              Preferred date
            </label>


            <CounselingDatePicker

              value={
                form.date
              }

              onChange={
                selectedDate =>
                  setForm({
                    ...form,
                    date:
                      selectedDate,

                    time:
                      ""
                  })
              }

            />

          </div>


          <label>

            Preferred time

            <select

              value={
                form.time
              }

              required

              onChange={
                e =>
                  setForm({
                    ...form,
                    time:
                      e.target.value
                  })
              }

            >

              <option value="">
                Choose preferred time
              </option>

              {COUNSELING_TIME_SLOTS.map(
                time => (

                  <option
                    key={time}
                    value={time}
                    disabled={
                      Boolean(
                        form.date &&
                        counselingTimeUnavailable(
                          form.date,
                          time
                        )
                      )
                    }
                  >
                    {
                      form.date &&
                      counselingTimeUnavailable(
                        form.date,
                        time
                      )
                        ? `${time} — Unavailable`
                        : time
                    }
                  </option>

                )
              )}

            </select>

          </label>


          <label>

            Concern

            <select

              value={
                form.category
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    category:
                      e.target.value
                  })
              }

            >

              {counselingConcernOptions.map(
                category => (

                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>

                )
              )}

            </select>

          </label>


          <label>

            Details

            <textarea

              rows="4"

              value={
                form.message
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    message:
                      e.target.value
                  })
              }

              placeholder="Provide additional details about your concern."

            />

          </label>


          <button className="primary-button">

            Submit request

          </button>


          </fieldset>

        </form>


        <section className="panel">

          <h2>
            My requests
          </h2>


          <p
            style={{
              color: "#6a7283",
              marginTop: 0
            }}
          >
            You may edit a request while it is still Pending approval.
            Only one active counseling request is allowed at a time. A new request becomes available after the current request is marked Follow up is recommended or Concluded.
          </p>


          {rows.length === 0

            ? (

              <Empty
                text="No counseling request yet."
              />

            )

            : rows.map(
                row => {

                  const isEditing =
                    editingId ===
                    row.id;


                  const canEdit =
                    row.status ===
                      "Pending approval" &&
                    row.transferStatus !==
                      "Pending approval";


                  return (

                    <article

                      id={
                        `consultation-${row.id}`
                      }

                      className={
                        row.id ===
                          requestedRequestId
                          ? "record-card notification-target-highlight"
                          : "record-card"
                      }

                      key={
                        row.id
                      }

                      onClick={
                        clearNotificationNavigation
                      }

                    >


                      {isEditing &&
                      editForm

                        ? (

                          <form
                            onSubmit={
                              e =>
                                saveEdit(
                                  e,
                                  row
                                )
                            }
                          >

                            <h3
                              style={{
                                marginTop: 0,
                                color: "#173f8f"
                              }}
                            >
                              Edit counseling request
                            </h3>


                            <label>

                              Mode

                              <select

                                value={
                                  editForm.mode
                                }

                                required

                                onChange={
                                  e =>
                                    setEditForm({
                                      ...editForm,
                                      mode:
                                        e.target.value
                                    })
                                }

                              >

                                <option value="">
                                  Choose counseling mode
                                </option>

                                <option value="Face-to-face">
                                  Face-to-face
                                </option>

                              </select>

                            </label>


                            <div className="counseling-date-field">

                              <label>
                                Preferred date
                              </label>


                              <CounselingDatePicker

                                value={
                                  editForm.date
                                }

                                onChange={
                                  selectedDate =>
                                    setEditForm({
                                      ...editForm,
                                      date:
                                        selectedDate,

                                      time:
                                        ""
                                    })
                                }

                              />

                            </div>


                            <label>

                              Preferred time

                              <select

                                value={
                                  editForm.time
                                }

                                required

                                onChange={
                                  e =>
                                    setEditForm({
                                      ...editForm,
                                      time:
                                        e.target.value
                                    })
                                }

                              >

                                <option value="">
                                  Choose preferred time
                                </option>

                                {COUNSELING_TIME_SLOTS.map(
                                  time => (

                                    <option
                                      key={time}
                                      value={time}
                                      disabled={
                                        Boolean(
                                          editForm.date &&
                                          counselorScheduleSlots.some(
                                            slot =>
                                              slot.counselorId ===
                                                (
                                                  row.assignedCounselorId ||
                                                  currentAssignedCounselorId
                                                ) &&
                                              slot.date ===
                                                editForm.date &&
                                              slot.time ===
                                                time &&
                                              activeCounselingSlotState(
                                                slot.state
                                              ) &&
                                              slot.consultationId !==
                                                row.id
                                          )
                                        )
                                      }
                                    >
                                      {
                                        editForm.date &&
                                        counselorScheduleSlots.some(
                                          slot =>
                                            slot.counselorId ===
                                              (
                                                row.assignedCounselorId ||
                                                currentAssignedCounselorId
                                              ) &&
                                            slot.date ===
                                              editForm.date &&
                                            slot.time ===
                                              time &&
                                            activeCounselingSlotState(
                                              slot.state
                                            ) &&
                                            slot.consultationId !==
                                              row.id
                                        )
                                          ? `${time} — Unavailable`
                                          : time
                                      }
                                    </option>

                                  )
                                )}

                              </select>

                            </label>


                            <label>

                              Concern

                              <select

                                value={
                                  editForm.category
                                }

                                onChange={
                                  e =>
                                    setEditForm({
                                      ...editForm,
                                      category:
                                        e.target.value
                                    })
                                }

                              >

                                {counselingConcernOptions.map(
                                  category => (

                                    <option
                                      key={category}
                                      value={category}
                                    >
                                      {category}
                                    </option>

                                  )
                                )}

                              </select>

                            </label>


                            <label>

                              Details

                              <textarea

                                rows="4"

                                value={
                                  editForm.message
                                }

                                onChange={
                                  e =>
                                    setEditForm({
                                      ...editForm,
                                      message:
                                        e.target.value
                                    })
                                }

                                placeholder="Provide additional details about your concern."

                              />

                            </label>


                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                                marginTop: "16px"
                              }}
                            >

                              <button
                                className="primary-button"
                                disabled={
                                  savingEdit
                                }
                              >
                                {
                                  savingEdit
                                    ? "Saving..."
                                    : "Save changes"
                                }
                              </button>


                              <button
                                type="button"
                                className="secondary-button"
                                disabled={
                                  savingEdit
                                }
                                onClick={
                                  cancelEdit
                                }
                              >
                                Cancel
                              </button>

                            </div>

                          </form>

                        )

                        : (

                          <>

                            <strong>
                              {row.category}
                            </strong>


                            <span className="status">
                              {row.status}
                            </span>


                            {row.transferStatus ===
                              "Pending approval" && (

                              <div className="user-transfer-status user-transfer-status-pending">

                                <strong>
                                  Counselor transfer pending
                                </strong>

                                <span>
                                  {
                                    row.assignedCounselorName ||
                                    "Your current counselor"
                                  }
                                  {" "}
                                  remains assigned until another Guidance Counselor approves the transfer. Your counseling date and time stay unchanged while approval is pending.
                                </span>

                              </div>

                            )}


                            {row.transferStatus ===
                              "Approved" && (

                              <div className="user-transfer-status user-transfer-status-approved">

                                <strong>
                                  Counselor transferred
                                </strong>

                                <span>
                                  Your assigned counselor is now
                                  {" "}
                                  <b>
                                    {
                                      row.assignedCounselorName ||
                                      "the accepting Guidance Counselor"
                                    }
                                  </b>
                                  {
                                    row.assignedCounselorDepartment
                                      ? ` [${row.assignedCounselorDepartment}]`
                                      : ""
                                  }.
                                </span>

                              </div>

                            )}


                            <p>

                              {row.date}
                              {" · "}
                              {row.time}

                              {row.mode && (
                                <>
                                  {" · "}
                                  {row.mode}
                                </>
                              )}

                            </p>


                            {row.message && (

                              <p
                                style={{
                                  whiteSpace:
                                    "pre-wrap"
                                }}
                              >
                                <strong>
                                  Details:
                                </strong>
                                {" "}
                                {row.message}
                              </p>

                            )}


                            <div
                              style={{
                                marginTop: "12px",
                                padding: "12px 14px",
                                borderRadius: "10px",
                                background: "#f7f9fc",
                                border: "1px solid #dfe5ef"
                              }}
                            >

                              <strong
                                style={{
                                  display: "block",
                                  marginBottom: "6px",
                                  color: "#173f8f"
                                }}
                              >
                                Counselor Remarks
                              </strong>

                              <span
                                style={{
                                  whiteSpace: "pre-wrap"
                                }}
                              >
                                {
                                  row.counselorRemarks?.trim() ||
                                  "No counselor remarks yet."
                                }
                              </span>

                            </div>


                            {canEdit && (

                              <div
                                style={{
                                  marginTop:
                                    "14px"
                                }}
                              >

                                <button

                                  type="button"

                                  className="secondary-button"

                                  onClick={
                                    () =>
                                      startEdit(
                                        row
                                      )
                                  }

                                >
                                  Edit request
                                </button>

                              </div>

                            )}


                            {!canEdit && (

                              <small
                                style={{
                                  display: "block",
                                  marginTop: "12px",
                                  color: "#7b8495"
                                }}
                              >
                                {
                                  row.transferStatus ===
                                    "Pending approval"
                                    ? "This request cannot be edited while a counselor transfer is waiting for approval."
                                    : `This request can no longer be edited because it is ${String(row.status).toLowerCase()}.`
                                }
                              </small>

                            )}

                          </>

                        )
                      }

                    </article>

                  );
                }
              )
          }

        </section>

      </div>

    </>

  );
}


// ======================================================
// REFERRALS
// ======================================================

function Referrals() {

  const { user } =
    useAuth();


  const rows =
    useRows(
      "referrals",
      {
        ownerId:
          user.id
      }
    );


  const [form, setForm] =
    useState({

      personName:
        "",

      personType:
        "Student",

      department:
        "",

      reason:
        "",

      urgency:
        "Routine",

      contact:
        ""

    });


  async function submit(e) {

    e.preventDefault();


    if (!/^\d{11}$/.test(form.contact)) {

      alert(
        "Contact information must contain exactly 11 digits."
      );

      return;
    }


    await addRecord(
      "referrals",
      {

        ...form,

        ownerId:
          user.id,

        referrerId:
          user.id,

        referrerName:
          user.name,

        referrerRole:
          user.role,

        status:
          "Received"

      }
    );


    setForm({

      personName:
        "",

      personType:
        "Student",

      department:
        "",

      reason:
        "",

      urgency:
        "Routine",

      contact:
        ""

    });

  }


  const own =
    rows.filter(
      row =>
        row.referrerId ===
        user.id
    );


  return (

    <>

      <PageTitle

        title="Referral"

        subtitle="Teaching and non-teaching users may refer someone who may benefit from guidance support."

      />


      <div className="two-column">


        <form
          className="panel"
          onSubmit={submit}
        >


          <label>

            Name

            <input

              required

              value={
                form.personName
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    personName:
                      e.target.value
                  })
              }

            />

          </label>


          <label>

            Type

            <select

              value={
                form.personType
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    personType:
                      e.target.value
                  })
              }

            >

              <option>
                Student
              </option>

              <option>
                Teaching
              </option>

              <option>
                Non-teaching
              </option>

            </select>

          </label>


          <label>

            College / Office

            <select

              required

              value={
                form.department
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    department:
                      e.target.value
                  })
              }

            >

              <option
                value=""
                disabled
              >
                Select college / office
              </option>

              <option value="College of Education">
                College of Education
              </option>

              <option value="College of Tourism and Hospitality Management">
                College of Tourism and Hospitality Management
              </option>

              <option value="College of Industrial Technology">
                College of Industrial Technology
              </option>

              <option value="College of Arts, Sciences and Letters">
                College of Arts, Sciences and Letters
              </option>

              <option value="College of Computing Sciences">
                College of Computing Sciences
              </option>

              <option value="College of Business and Public Administration">
                College of Business and Public Administration
              </option>

            </select>

          </label>


          <label>

            Contact information

            <input

              type="tel"

              required

              inputMode="numeric"

              pattern="[0-9]{11}"

              minLength={11}

              maxLength={11}

              placeholder="09XXXXXXXXX"

              value={
                form.contact
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    contact:
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 11)
                  })
              }

            />

          </label>


          <label>

            Urgency

            <select

              value={
                form.urgency
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    urgency:
                      e.target.value
                  })
              }

            >

              <option>
                Routine
              </option>

              <option>
                Urgent
              </option>

            </select>

          </label>


          <label>

            Reason

            <textarea

              required

              rows="5"

              value={
                form.reason
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    reason:
                      e.target.value
                  })
              }

            />

          </label>


          <button className="primary-button">

            Submit referral

          </button>

        </form>


        <section className="panel">

          <h2>
            Referral status
          </h2>


          {own.length === 0

            ? (

              <Empty
                text="No referral submitted."
              />

            )

            : own.map(
                row => (

                  <article
                    className="record-card"
                    key={
                      row.id
                    }
                  >

                    <strong>
                      {
                        row.personName
                      }
                    </strong>


                    <span className="status">
                      {
                        row.status
                      }
                    </span>


                    <p>

                      {
                        row.personType
                      }

                      {" · "}

                      {
                        row.department
                      }

                      {" · "}

                      {
                        row.urgency
                      }

                    </p>


                    <small>

                      Private assessment and counseling notes are not shown to the referrer.

                    </small>

                  </article>

                )
              )
          }

        </section>

      </div>

    </>

  );
}



// ======================================================
// RATINGS & FEEDBACK
// STUDENT / TEACHING / NON-TEACHING
// ======================================================

function Feedback() {

  const { user } =
    useAuth();


  const allowedRoles = [
    "student",
    "teaching",
    "non_teaching",
    "faculty",
    "personnel"
  ];


  const [rating, setRating] =
    useState(0);

  const [category, setCategory] =
    useState(
      "Overall Experience"
    );

  const [feedback, setFeedback] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [history, setHistory] =
    useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(true);


  useEffect(
    () => {

      if (
        !user ||
        !allowedRoles.includes(
          user.role
        )
      ) {
        return undefined;
      }


      const ownFeedbackQuery =
        query(
          collection(
            db,
            "feedback"
          ),
          where(
            "ownerId",
            "==",
            user.id
          )
        );


      const unsubscribe =
        onSnapshot(
          ownFeedbackQuery,

          snapshot => {

            const rows =
              snapshot.docs.map(
                item => ({
                  id: item.id,
                  ...item.data()
                })
              );


            rows.sort(
              (a, b) =>
                feedbackTimestamp(b.createdAt) -
                feedbackTimestamp(a.createdAt)
            );


            setHistory(rows);
            setHistoryLoading(false);

          },

          err => {

            console.error(
              "Unable to load feedback history:",
              err
            );

            setHistory([]);
            setHistoryLoading(false);

          }
        );


      return unsubscribe;

    },
    [
      user?.id,
      user?.role
    ]
  );


  if (
    !allowedRoles.includes(
      user.role
    )
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  async function submit(e) {

    e.preventDefault();

    setMessage("");
    setError("");


    if (
      rating < 1 ||
      rating > 5
    ) {

      setError(
        "Please select a rating from 1 to 5 stars."
      );

      return;
    }


    try {

      setSaving(true);


      await addDoc(
        collection(
          db,
          "feedback"
        ),
        {
          ownerId:
            user.id,

          ownerName:
            user.name,

          role:
            user.role,

          department:
            user.department,

          rating,

          category,

          feedback:
            feedback.trim(),

          createdAt:
            serverTimestamp()
        }
      );


      setRating(0);

      setCategory(
        "Overall Experience"
      );

      setFeedback("");

      setMessage(
        "Thank you. Your rating and feedback were submitted successfully."
      );

    } catch (err) {

      console.error(
        "Feedback submission error:",
        err
      );


      setError(
        err?.code ===
        "permission-denied"

          ? "Firestore did not allow the feedback to be submitted. Please check the feedback security rules."

          : (
              err.message ||
              "Unable to submit your feedback."
            )
      );

    } finally {

      setSaving(false);

    }
  }


  return (

    <>

      <PageTitle
        title="Ratings & Feedback"
        subtitle="Share your experience with MindTrack. Your feedback helps improve the system."
      />


      <div className="feedback-page-layout">


        <form
          className="panel feedback-form-panel"
          onSubmit={submit}
        >

          <h2>
            Rate your MindTrack experience
          </h2>

          <p className="feedback-help-text">
            Select from 1 to 5 stars. Five stars means an excellent experience.
          </p>


          <div
            className="star-rating"
            role="radiogroup"
            aria-label="MindTrack rating"
          >

            {[1, 2, 3, 4, 5].map(
              value => (

                <button
                  key={value}
                  type="button"
                  className={
                    value <= rating
                      ? "star-button selected"
                      : "star-button"
                  }
                  onClick={
                    () =>
                      setRating(value)
                  }
                  aria-label={
                    `${value} star${value > 1 ? "s" : ""}`
                  }
                  aria-pressed={
                    value === rating
                  }
                >

                  <Star
                    size={34}
                    fill={
                      value <= rating
                        ? "currentColor"
                        : "none"
                    }
                  />

                </button>

              )
            )}

          </div>


          <div className="rating-label">

            {rating === 5
              ? "Excellent"
              : rating === 4
                ? "Very Good"
                : rating === 3
                  ? "Good"
                  : rating === 2
                    ? "Fair"
                    : rating === 1
                      ? "Poor"
                      : "Select a rating"}

          </div>


          <label>
            Feedback Category

            <select
              value={category}
              onChange={
                e =>
                  setCategory(
                    e.target.value
                  )
              }
            >

              <option>
                Overall Experience
              </option>

              <option>
                Ease of Use
              </option>

              <option>
                System Performance
              </option>

              <option>
                Assessment
              </option>

              <option>
                Counseling
              </option>

              <option>
                Privacy and Security
              </option>

              <option>
                Interface / Design
              </option>

              <option>
                Other
              </option>

            </select>

          </label>


          <label>
            Feedback
            {" "}

            <span className="optional-text">
              (Optional)
            </span>

            <textarea
              rows="5"
              value={feedback}
              onChange={
                e =>
                  setFeedback(
                    e.target.value
                  )
              }
              maxLength={1000}
              placeholder="Tell us what you liked, what was difficult, or what we can improve."
            />

          </label>


          <div className="feedback-character-count">
            {feedback.length}/1000
          </div>


          {message && (
            <div className="success-box">
              {message}
            </div>
          )}


          {error && (
            <div className="error-box">
              {error}
            </div>
          )}


          <button
            className="primary-button"
            disabled={
              saving ||
              rating === 0
            }
          >

            {saving
              ? "Submitting..."
              : "Submit Feedback"}

          </button>


          <div className="profile-note">

            Ratings & Feedback is for improving the MindTrack system.
            It is separate from the formal research acceptability questionnaire.

          </div>

        </form>


        <section className="panel feedback-history-panel">

          <h2>
            My Feedback History
          </h2>


          {historyLoading

            ? (

              <Empty
                text="Loading your feedback..."
              />

            )

            : history.length === 0

              ? (

                <Empty
                  text="You have not submitted any feedback yet."
                />

              )

              : (

                <div className="feedback-history-list">

                  {history.map(
                    item => (

                      <article
                        key={item.id}
                        className="feedback-history-card"
                      >

                        <div className="feedback-history-top">

                          <div className="feedback-stars-text">
                            {
                              "★".repeat(
                                Number(
                                  item.rating || 0
                                )
                              )
                            }
                            {
                              "☆".repeat(
                                Math.max(
                                  0,
                                  5 -
                                  Number(
                                    item.rating || 0
                                  )
                                )
                              )
                            }
                          </div>

                          <small>
                            {
                              formatFeedbackDate(
                                item.createdAt
                              )
                            }
                          </small>

                        </div>


                        <strong>
                          {
                            item.category ||
                            "Overall Experience"
                          }
                        </strong>


                        <p>
                          {
                            item.feedback?.trim()
                              ? item.feedback
                              : "No written comment."
                          }
                        </p>

                      </article>

                    )
                  )}

                </div>

              )
          }

        </section>

      </div>

    </>

  );
}


function feedbackTimestamp(value) {

  if (!value) {
    return 0;
  }


  if (
    typeof value.toMillis ===
    "function"
  ) {
    return value.toMillis();
  }


  if (
    typeof value.seconds ===
    "number"
  ) {
    return value.seconds * 1000;
  }


  const parsed =
    new Date(value).getTime();


  return Number.isNaN(parsed)
    ? 0
    : parsed;
}


function formatFeedbackDate(value) {

  const timestamp =
    feedbackTimestamp(value);


  if (!timestamp) {
    return "Just now";
  }


  return new Date(
    timestamp
  ).toLocaleString();

}


// ======================================================
// USER PROFILE
// ======================================================

function Profile() {

  const {
    user,
    updateProfile
  } = useAuth();

  const allowedRoles = [
    "student",
    "teaching",
    "non_teaching",
    "faculty",
    "personnel"
  ];

  const [form, setForm] =
    useState({
      gender:
        user?.gender || "",

      phoneNumber:
        user?.phoneNumber || "",

      address:
        user?.address || "",

      facebookAccount:
        user?.facebookAccount || "",

      contactPersonName:
        user?.contactPersonName || "",

      contactPersonPhone:
        user?.contactPersonPhone || ""
    });


  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  useEffect(
    () => {

      setForm({
        gender:
          user?.gender || "",

        phoneNumber:
          user?.phoneNumber || "",

        address:
          user?.address || "",

        facebookAccount:
          user?.facebookAccount || "",

        contactPersonName:
          user?.contactPersonName || "",

        contactPersonPhone:
          user?.contactPersonPhone || ""
      });

    },
    [
      user?.gender,
      user?.phoneNumber,
      user?.address,
      user?.facebookAccount,
      user?.contactPersonName,
      user?.contactPersonPhone
    ]
  );


  if (
    !allowedRoles.includes(
      user.role
    )
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  function change(e) {

    const {
      name,
      value
    } = e.target;


    const numericFields = [
      "phoneNumber",
      "contactPersonPhone"
    ];


    const nextValue =
      numericFields.includes(name)

        ? value.replace(/\D/g, "")

        : value;


    setForm(
      current => ({
        ...current,
        [name]: nextValue
      })
    );
  }


  async function submit(e) {

    e.preventDefault();

    setMessage("");
    setError("");


    if (
      !GENDER_OPTIONS.includes(
        form.gender
      )
    ) {

      setError(
        "Please select Male or Female."
      );

      return;
    }


    if (
      !form.phoneNumber.trim()
    ) {

      setError(
        "Please enter your phone number."
      );

      return;
    }


    if (
      form.phoneNumber.length !== 11
    ) {

      setError(
        "Phone number must contain exactly 11 digits."
      );

      return;
    }


    if (
      !form.contactPersonName.trim()
    ) {

      setError(
        "Please enter your contact person's name."
      );

      return;
    }


    if (
      !form.contactPersonPhone.trim()
    ) {

      setError(
        "Please enter your contact person's phone number."
      );

      return;
    }


    if (
      form.contactPersonPhone.length !== 11
    ) {

      setError(
        "Contact person phone number must contain exactly 11 digits."
      );

      return;
    }


    if (
      !form.address.trim()
    ) {

      setError(
        "Please enter your address."
      );

      return;
    }


    try {

      setSaving(true);


      await updateProfile({
        gender:
          form.gender,

        phoneNumber:
          form.phoneNumber,

        address:
          form.address,

        facebookAccount:
          form.facebookAccount,

        contactPersonName:
          form.contactPersonName,

        contactPersonPhone:
          form.contactPersonPhone
      });


      setMessage(
        "Profile updated successfully."
      );

    } catch (err) {

      console.error(
        "Profile update error:",
        err
      );


      setError(
        err.message ||
        "Unable to update your profile."
      );

    } finally {

      setSaving(false);
    }
  }


  return (

    <>

      <PageTitle
        title="My Profile"
        subtitle="View your account information and keep your personal contact details updated."
      />


      <div className="profile-layout">


        <section className="panel profile-summary-card">

          <div
            className="profile-avatar"
            aria-hidden="true"
          >

            {
              user.name
                ?.trim()
                ?.charAt(0)
                ?.toUpperCase() ||
              "U"
            }

          </div>


          <h2>
            {user.name}
          </h2>

          <p>
            {user.email}
          </p>


          <div className="profile-role-badge">

            {
              generalUserRoleLabel(
                user.role
              )
            }

          </div>

        </section>


        <section className="panel profile-form-panel">

          <h2>
            Account Information
          </h2>


          <div className="profile-grid">

            <label>
              Full Name

              <input
                value={
                  user.name ||
                  ""
                }
                readOnly
              />
            </label>


            <label>
              Email

              <input
                value={
                  user.email ||
                  ""
                }
                readOnly
              />
            </label>


            <label>
              Account Type

              <input
                value={
                  generalUserRoleLabel(
                    user.role
                  )
                }
                readOnly
              />
            </label>


            <label>
              {
                user.role === "student"
                  ? "College / Office"
                  : "Assigned Counselor College"
              }

              <input
                value={
                  user.department ||
                  ""
                }
                readOnly
              />
            </label>


            {employeeUserRole(
              user.role
            ) && (

              <label className="full-width-field">
                Assigned Counselor

                <input
                  value={
                    user.assignedCounselorName
                      ? `${user.assignedCounselorName} [${user.assignedCounselorDepartment || user.department || "College not provided"}]`
                      : "Not assigned"
                  }
                  readOnly
                />
              </label>

            )}


            {user.role === "student" && (

              <label className="full-width-field">
                Program

                <input
                  value={
                    user.program ||
                    "Not provided"
                  }
                  readOnly
                />
              </label>

            )}


            <label>

              {
                user.role ===
                "student"

                  ? "Student Number"

                  : "Employee Number"
              }

              <input
                value={
                  user.userNumber ||
                  ""
                }
                readOnly
              />
            </label>

          </div>


          <div className="profile-note">

            Account type, college/office, program, email, and student/employee number are locked here to protect account and department records.

          </div>


          <form onSubmit={submit}>

            <h2>
              Personal Information
            </h2>


            <div className="profile-grid">

              <label>
                Gender

                <select
                  name="gender"
                  value={
                    form.gender
                  }
                  onChange={change}
                  required
                >

                  <option
                    value=""
                    disabled
                  >
                    Select gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                </select>
              </label>


              <label>
                Phone Number

                <input
                  type="tel"
                  name="phoneNumber"
                  value={
                    form.phoneNumber
                  }
                  onChange={change}
                  inputMode="numeric"
                  pattern="[0-9]{11}"
                  minLength={11}
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  required
                />
              </label>


              <label>

                Facebook Account
                {" "}

                <span className="optional-text">
                  (Optional)
                </span>

                <input
                  type="text"
                  name="facebookAccount"
                  value={
                    form.facebookAccount
                  }
                  onChange={change}
                />
              </label>


              <label className="full-width-field">
                Address

                <textarea
                  name="address"
                  rows="3"
                  value={
                    form.address
                  }
                  onChange={change}
                  required
                />
              </label>

            </div>


            <h2>
              Contact Person
            </h2>

            <p className="profile-note">
              Contact person information is required for user safety.
            </p>


            <div className="profile-grid">

              <label>
                Contact Person Name

                <input
                  type="text"
                  name="contactPersonName"
                  value={
                    form.contactPersonName
                  }
                  onChange={change}
                  required
                />
              </label>


              <label>
                Contact Person Phone Number

                <input
                  type="tel"
                  name="contactPersonPhone"
                  value={
                    form.contactPersonPhone
                  }
                  onChange={change}
                  inputMode="numeric"
                  pattern="[0-9]{11}"
                  minLength={11}
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  required
                />
              </label>

            </div>


            {message && (
              <div className="success-box">
                {message}
              </div>
            )}


            {error && (
              <div className="error-box">
                {error}
              </div>
            )}


            <button
              className="primary-button"
              disabled={saving}
            >

              {
                saving
                  ? "Saving..."
                  : "Save Profile"
              }

            </button>

          </form>

        </section>

      </div>

    </>

  );
}


// ======================================================
// USER PROFILES - COUNSELOR / SUPER ADMIN (READ ONLY)
// ======================================================

function UserProfiles() {

  const { user } =
    useAuth();


  const allowedRoles = [
    "counselor",
    "super_admin"
  ];


  if (
    !allowedRoles.includes(
      user.role
    )
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  return (
    <UserProfilesContent
      currentUser={user}
    />
  );
}


function UserProfilesContent({
  currentUser
}) {

  const isSuperAdmin =
    currentUser.role ===
    "super_admin";


  const [departmentRows, setDepartmentRows] =
    useState([]);

  const [transferredRows, setTransferredRows] =
    useState([]);

  const [profileTransferMap, setProfileTransferMap] =
    useState({});

  const [loadingUsers, setLoadingUsers] =
    useState(true);

  const [usersError, setUsersError] =
    useState("");


  useEffect(
    () => {

      setLoadingUsers(true);
      setUsersError("");

      let usersQuery =
        collection(
          db,
          "users"
        );

      if (!isSuperAdmin) {
        usersQuery =
          query(
            usersQuery,
            where(
              "department",
              "==",
              currentUser.department
            )
          );
      }

      const unsubscribe =
        onSnapshot(
          usersQuery,
          snapshot => {

            const data =
              snapshot.docs.map(
                item => ({
                  id: item.id,
                  ...item.data()
                })
              );

            setDepartmentRows(data);
            setLoadingUsers(false);
          },
          error => {

            console.error(
              "Unable to load user profiles:",
              error
            );

            setDepartmentRows([]);
            setUsersError(
              error?.message ||
              "Unable to load user profiles."
            );
            setLoadingUsers(false);
          }
        );

      return unsubscribe;

    },
    [
      isSuperAdmin,
      currentUser.department
    ]
  );


  // Track transfer state without exposing private counseling
  // profile fields to counselors who are no longer assigned.
  // Super Admin may audit counselingProfiles; counselors use
  // transferAccess records for users transferred away from them.
  useEffect(
    () => {

      const transferStateQuery =
        isSuperAdmin
          ? collection(
              db,
              "counselingProfiles"
            )
          : query(
              collection(
                db,
                "transferAccess"
              ),
              where(
                "previousCounselorId",
                "==",
                currentUser.id
              )
            );


      return onSnapshot(
        transferStateQuery,

        snapshot => {

          const map = {};


          snapshot.docs.forEach(
            item => {

              const data =
                item.data();


              if (isSuperAdmin) {

                map[
                  item.id
                ] =
                  data;

                return;
              }


              if (
                data.ownerId &&
                data.active ===
                  true
              ) {

                map[
                  data.ownerId
                ] = {
                  transferActive:
                    true,

                  assignedCounselorId:
                    data.counselorId ||
                    ""
                };
              }
            }
          );


          setProfileTransferMap(
            map
          );
        },

        error => {

          console.error(
            "Unable to load counseling transfer state:",
            error
          );


          setProfileTransferMap(
            {}
          );
        }
      );

    },

    [
      isSuperAdmin,
      currentUser.id
    ]
  );


  // Load users formally transferred TO the current counselor.
  useEffect(
    () => {

      if (isSuperAdmin) {

        setTransferredRows([]);

        return undefined;
      }


      const accessQuery =
        query(
          collection(
            db,
            "transferAccess"
          ),
          where(
            "counselorId",
            "==",
            currentUser.id
          ),
          where(
            "active",
            "==",
            true
          )
        );


      return onSnapshot(
        accessQuery,

        async snapshot => {

          try {

            const rows =
              await Promise.all(
                snapshot.docs.map(
                  async accessDoc => {

                    const access =
                      accessDoc.data();


                    if (!access.ownerId) {
                      return null;
                    }


                    const userSnap =
                      await getDoc(
                        doc(
                          db,
                          "users",
                          access.ownerId
                        )
                      );


                    if (!userSnap.exists()) {
                      return null;
                    }


                    return {
                      id:
                        userSnap.id,

                      ...userSnap.data(),

                      _transferredAccess:
                        true,

                      _transferAccessId:
                        accessDoc.id
                    };
                  }
                )
              );


            setTransferredRows(
              rows.filter(Boolean)
            );

          } catch (error) {

            console.error(
              "Unable to load transferred users:",
              error
            );


            setTransferredRows([]);
          }
        },

        error => {

          console.error(
            "Unable to load transfer access for User Profiles:",
            error
          );


          setTransferredRows([]);
        }
      );

    },

    [
      isSuperAdmin,
      currentUser.id
    ]
  );


  // Keep same-department users visible to a former counselor
  // for read-only documentation after a transfer. Cross-college
  // former counselors keep access through their transferAccess record.
  const activeDepartmentRows =
    departmentRows;


  const combinedRows =
    isSuperAdmin
      ? departmentRows
      : mergeRowsById(
          activeDepartmentRows,
          transferredRows
        );


  const users =
    combinedRows.filter(
      account => {

        const role =
          String(
            account.role || ""
          )
            .trim()
            .toLowerCase();

        return generalUserRole(
          role
        );
      }
    );


  const [selected, setSelected] =
    useState(null);

  const [selectedCollege, setSelectedCollege] =
    useState(
      isSuperAdmin
        ? "All Colleges / Offices"
        : currentUser.department
    );

  const [selectedProgram, setSelectedProgram] =
    useState("All Programs");

  const [selectedTransferStatus, setSelectedTransferStatus] =
    useState("All Users");


  function isTransferredAccount(account) {

    if (isSuperAdmin) {
      return Boolean(
        profileTransferMap[
          account.id
        ]?.transferActive
      );
    }


    return Boolean(
      account._transferredAccess ||
      profileTransferMap[
        account.id
      ]?.transferActive
    );
  }


  const collegeOptions =
    Array.from(
      new Set(
        users.map(
          account =>
            String(
              account.department || ""
            ).trim()
        ).filter(Boolean)
      )
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );


  const usersForProgramOptions =
    users.filter(
      account =>
        (
          !isSuperAdmin ||
          selectedCollege ===
            "All Colleges / Offices" ||
          account.department ===
            selectedCollege
        ) &&
        account.role ===
          "student" &&
        String(
          account.program || ""
        ).trim()
    );


  const programOptions =
    Array.from(
      new Set(
        usersForProgramOptions.map(
          account =>
            String(
              account.program
            ).trim()
        )
      )
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );


  const visibleUsers =
    users
      .filter(
        account => {

          const collegeMatches =
            !isSuperAdmin ||
            selectedCollege ===
              "All Colleges / Offices" ||
            account.department ===
              selectedCollege;

          const programMatches =
            selectedProgram ===
              "All Programs" ||
            (
              account.role ===
                "student" &&
              account.program ===
                selectedProgram
            );

          const transferred =
            isTransferredAccount(
              account
            );

          const transferMatches =
            selectedTransferStatus ===
              "All Users" ||
            (
              selectedTransferStatus ===
                "Transferred" &&
              transferred
            ) ||
            (
              selectedTransferStatus ===
                "Not Transferred" &&
              !transferred
            );

          return (
            collegeMatches &&
            programMatches &&
            transferMatches
          );
        }
      )
      .sort(
        (a, b) =>
          String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            )
          )
      );


  function changeCollegeFilter(value) {
    setSelectedCollege(value);
    setSelectedProgram(
      "All Programs"
    );
    setSelected(null);
  }


  function displayRole(role) {
    return generalUserRoleLabel(
      role
    );
  }


  return (

    <>

      <PageTitle
        title="User Profiles"
        subtitle={
          isSuperAdmin
            ? "Filter users by college/office, program, and transfer status, then open the complete user profile."
            : `View users from ${currentUser.department} together with users formally transferred to you.`
        }
      />


      <div className="readonly-access-notice">
        <strong>Profile access</strong>
        <span>
          User profile information is read-only. Private case information is managed from Counseling Requests by the assigned counselor or Super Admin. Approved transferred users remain accessible to the accepting counselor through transfer access.
        </span>
      </div>


      <section className="panel profile-filter-panel">

        <div className="profile-filter-heading">
          <div>
            <h2>Find Users</h2>
            <p>
              Use the filters below to narrow the user list.
            </p>
          </div>

          <span className="profile-result-count">
            {visibleUsers.length} result{visibleUsers.length === 1 ? "" : "s"}
          </span>
        </div>


        <div className="profile-filter-grid transfer-profile-filter-grid">

          {isSuperAdmin && (
            <label>
              College / Office
              <select
                value={selectedCollege}
                onChange={
                  event =>
                    changeCollegeFilter(
                      event.target.value
                    )
                }
              >
                <option>All Colleges / Offices</option>
                {collegeOptions.map(
                  college => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  )
                )}
              </select>
            </label>
          )}


          <label>
            Program
            <select
              value={selectedProgram}
              onChange={
                event =>
                  setSelectedProgram(
                    event.target.value
                  )
              }
            >
              <option>All Programs</option>
              {programOptions.map(
                program => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                )
              )}
            </select>
          </label>


          <label>
            Transfer Status
            <select
              value={selectedTransferStatus}
              onChange={
                event =>
                  setSelectedTransferStatus(
                    event.target.value
                  )
              }
            >
              <option>All Users</option>
              <option>Transferred</option>
              <option>Not Transferred</option>
            </select>
          </label>

        </div>

      </section>


      <section className="panel">

        <div className="user-list-heading">
          <div>
            <h2>User List</h2>
            <p>
              A Transferred indicator is shown in the list when the account is available through an approved counselor transfer.
            </p>
          </div>
        </div>


        {loadingUsers
          ? <Empty text="Loading user profiles..." />
          : usersError
            ? <div className="error-box">{usersError}</div>
            : visibleUsers.length === 0
              ? <Empty text="No users match the selected filters." />
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>College / Office</th>
                        <th>Program</th>
                        <th>Transfer</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUsers.map(
                        account => (
                          <tr key={account.id}>
                            <td>{account.name}</td>
                            <td>{displayRole(account.role)}</td>
                            <td>{account.department || "—"}</td>
                            <td>
                              {account.role === "student"
                                ? account.program || "Not provided"
                                : "—"}
                            </td>
                            <td>
                              {isTransferredAccount(account)
                                ? <span className="transferred-table-badge">Transferred</span>
                                : "—"}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="text-button"
                                onClick={() => setSelected(account)}
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

      </section>


      {selected && (
        <UserProfileFullScreen
          profile={selected}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
        />
      )}

    </>
  );
}


// ======================================================
// USER NOTIFICATIONS
// ======================================================

function Notifications() {

  const { user } =
    useAuth();


  if (
    !generalUserRole(
      user.role
    ) &&
    user.role !==
      "counselor"
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  return (
    <UserNotificationsContent
      user={user}
    />
  );
}


function UserNotificationsContent({
  user
}) {

  const navigate =
    useNavigate();


  const allRows =
    useRows(
      "notifications",
      {
        ownerId:
          user.id
      }
    );


  const rows =
    allRows.filter(
      row => {

        if (
          user.role ===
          "counselor"
        ) {

          return [
            "transfer_request",
            "transfer_status"
          ].includes(
            row.notificationType
          );
        }


        return [
          "counselor_update",
          "counselor_transfer_update"
        ].includes(
          row.notificationType
        ) &&
        row.senderRole ===
          "counselor";
      }
    );


  const unreadRows =
    rows.filter(
      row =>
        !row.read
    );


  async function openNotification(
    row
  ) {

    try {

      if (!row.read) {

        await updateRecord(
          "notifications",
          row.id,
          {
            read:
              true
          }
        );
      }

    } catch (error) {

      console.error(
        "Unable to mark notification as read:",
        error
      );
    }


    if (
      row.sourceType ===
        "consultation" &&
      row.sourceId
    ) {

      navigate(
        "/consultations",
        {
          state: {
            requestId:
              row.sourceId,

            fromNotification:
              true
          }
        }
      );

      return;
    }


    if (
      row.sourceType ===
        "assessment" &&
      row.sourceId
    ) {

      navigate(
        "/monitoring",
        {
          state: {
            assessmentId:
              row.sourceId,

            fromNotification:
              true
          }
        }
      );

      return;
    }


    if (
      row.sourceType ===
        "transfer"
    ) {

      navigate(
        "/dashboard",
        {
          state: {
            transferRequestId:
              row.sourceId ||
              row.transferRequestId ||
              ""
          }
        }
      );

      return;
    }


    navigate(
      row.targetPath ||
      "/history"
    );
  }


  async function markAllRead() {

    if (
      unreadRows.length === 0
    ) {
      return;
    }


    try {

      await Promise.all(
        unreadRows.map(
          row =>
            updateRecord(
              "notifications",
              row.id,
              {
                read:
                  true
              }
            )
        )
      );

    } catch (error) {

      console.error(
        "Unable to mark all notifications as read:",
        error
      );


      alert(
        "Unable to mark all notifications as read."
      );
    }
  }


  return (

    <>

      <PageTitle

        title="Notifications"

        subtitle={
          user.role === "counselor"
            ? "Transfer requests and transfer status updates for Guidance Counselors."
            : "Counselor updates about your psychological assessment cases, counseling requests, and counselor transfers."
        }

      />


      <section className="panel notification-panel">

        <div className="notification-panel-heading">

          <div>

            <h2>
              Your Notifications
            </h2>

            <p>
              {
                unreadRows.length
              }
              {" "}
              unread notification
              {
                unreadRows.length === 1
                  ? ""
                  : "s"
              }
            </p>

          </div>


          {unreadRows.length > 0 && (

            <button

              type="button"

              className="secondary-button"

              onClick={
                markAllRead
              }

            >
              Mark all as read
            </button>

          )}

        </div>


        {rows.length === 0

          ? (

            <Empty
              text="No notifications yet."
            />

          )

          : (

            <div className="notification-list">

              {rows.map(
                row => (

                  <button

                    type="button"

                    key={
                      row.id
                    }

                    className={
                      row.read
                        ? "notification-card"
                        : "notification-card unread"
                    }

                    onClick={
                      () =>
                        openNotification(
                          row
                        )
                    }

                  >

                    <div className="notification-icon">

                      <Bell
                        size={19}
                      />

                    </div>


                    <div className="notification-content">

                      <div className="notification-title-row">

                        <strong>
                          {
                            row.title ||
                            "MindTrack update"
                          }
                        </strong>


                        {!row.read && (

                          <span className="notification-unread-label">
                            New
                          </span>

                        )}

                      </div>


                      <p>
                        {
                          row.message ||
                          "You have a new system update."
                        }
                      </p>


                      <div className="notification-meta-row">

                        <small>
                          {
                            formatRecordDateTime(
                              row.createdAt
                            )
                          }
                        </small>


                        <span className="notification-open-link">
                          View update →
                        </span>

                      </div>

                    </div>

                  </button>

                )
              )}

            </div>

          )
        }

      </section>

    </>

  );
}


// ======================================================
// USER MENTAL HEALTH MONITORING
// ======================================================

function Monitoring() {

  const { user } =
    useAuth();


  if (
    !generalUserRole(
      user.role
    )
  ) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  return (
    <UserMonitoringContent
      user={user}
    />
  );
}


function UserMonitoringContent({
  user
}) {

  const navigate =
    useNavigate();


  const location =
    useLocation();


  const assessments =
    useRows(
      "assessments",
      {
        ownerId:
          user.id
      }
    );


  const requestedAssessmentId =
    location.state
      ?.assessmentId ||
    "";


  const reviewedAssessments =
    [...assessments]
      .filter(
        isCounselorReviewedAssessment
      )
      .sort(
        (a, b) => {

          const aDate =
            recordDateObject(
              a.createdAt
            );


          const bDate =
            recordDateObject(
              b.createdAt
            );


          return (
            (bDate?.getTime() || 0) -
            (aDate?.getTime() || 0)
          );
        }
      );


  const pendingAssessments =
    assessments.filter(
      row =>
        !isCounselorReviewedAssessment(
          row
        )
    );


  const latest =
    reviewedAssessments[0] ||
    null;


  const previous =
    reviewedAssessments[1] ||
    null;


  const trend =
    compareReviewedAssessmentTrend(
      latest,
      previous
    );


  const latestResults =
    latest?.instrumentResults ||
    null;


  const notificationAssessment =
    requestedAssessmentId
      ? reviewedAssessments.find(
          row =>
            row.id ===
            requestedAssessmentId
        )
      : null;


  const openedFromNotification =
    Boolean(
      notificationAssessment
    );


  useEffect(
    () => {

      if (
        !requestedAssessmentId ||
        !notificationAssessment
      ) {

        return undefined;
      }


      const timer =
        window.setTimeout(
          () => {

            const element =
              document.getElementById(
                `monitoring-assessment-${requestedAssessmentId}`
              );


            element?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "center"
            });
          },
          160
        );


      return () =>
        window.clearTimeout(
          timer
        );

    },

    [
      requestedAssessmentId,
      notificationAssessment
    ]
  );


  return (

    <>

      <PageTitle

        title="Mental Health Monitoring"

        subtitle="Your current monitoring state and trend are based only on assessments reviewed by a Guidance Counselor."

      />


      {assessments.length === 0

        ? (

          <section className="panel monitoring-empty-panel">

            <Activity
              size={42}
            />

            <h2>
              No assessment data yet
            </h2>

            <p>
              Complete a psychological assessment first. Your Monitoring page will show a current state after a Guidance Counselor reviews the assessment.
            </p>


            <button

              type="button"

              className="primary-button"

              onClick={
                () =>
                  navigate(
                    "/assessment"
                  )
              }

            >
              Take an assessment
            </button>

          </section>

        )

        : !latest

          ? (

            <section className="panel monitoring-review-gate">

              <Activity
                size={42}
              />

              <h2>
                Awaiting counselor review
              </h2>

              <p>
                You have submitted an assessment, but MindTrack will not display a current mental health monitoring state until a Guidance Counselor has reviewed the case and selected a reviewed status.
              </p>


              <div className="notice">
                Your assessment scores are not used here as your current monitoring state while the case is still marked for review.
              </div>


              <span className="monitoring-pending-count">
                {
                  pendingAssessments.length
                }
                {" "}
                assessment
                {
                  pendingAssessments.length === 1
                    ? ""
                    : "s"
                }
                {" "}
                awaiting counselor review
              </span>

            </section>

          )

          : (

            <>

              {openedFromNotification && (

                <section className="monitoring-notification-banner">
                  You opened Monitoring from a counselor notification. Your current state below still uses your latest counselor-reviewed assessment.
                </section>

              )}


              <section className="panel monitoring-summary-panel">

                <div className="monitoring-summary-header">

                  <div>

                    <span className="monitoring-kicker">
                      Current Reviewed Monitoring State
                    </span>

                    <h2>
                      Based on your latest counselor-reviewed assessment
                    </h2>

                    <p>
                      Assessment taken:
                      {" "}
                      {
                        formatRecordDateTime(
                          latest.createdAt
                        )
                      }
                    </p>

                  </div>


                  <span
                    className={
                      priorityClassName(
                        latest.priority
                      )
                    }
                  >
                    {
                      latest.priority ||
                      "No priority"
                    }
                  </span>

                </div>


                <div className="monitoring-status-grid">

                  <div className="monitoring-status-item">

                    <span>
                      Counselor Review Status
                    </span>

                    <strong>
                      {
                        assessmentCaseStatusLabel(
                          latest.status
                        )
                      }
                    </strong>

                  </div>


                  <div className="monitoring-status-item">

                    <span>
                      Reviewed By
                    </span>

                    <strong>
                      {
                        latest.reviewedByName ||
                        "Guidance Counselor"
                      }
                    </strong>

                  </div>

                </div>


                {latest.counselorRemarks && (

                  <div className="monitoring-counselor-note">

                    <strong>
                      Counselor Remark
                    </strong>

                    <p>
                      {
                        latest.counselorRemarks
                      }
                    </p>

                  </div>

                )}

              </section>


              <section
                className={
                  `panel monitoring-trend-panel ${trend.key}`
                }
              >

                <div className="monitoring-trend-header">

                  <div>

                    <span className="monitoring-kicker">
                      Monitoring Trend
                    </span>

                    <h2>
                      {
                        trend.label
                      }
                    </h2>

                  </div>


                  <Activity
                    size={28}
                  />

                </div>


                <p>
                  {
                    trend.summary
                  }
                </p>


                {previous && (

                  <small>
                    Compared with the previous counselor-reviewed assessment from
                    {" "}
                    {
                      formatRecordDateTime(
                        previous.createdAt
                      )
                    }.
                  </small>

                )}


                <div className="notice monitoring-trend-note">
                  This trend is a simple comparison of the available screening scores. It is a monitoring aid and not a diagnosis or a substitute for a counselor's professional assessment.
                </div>

              </section>


              {latestResults

                ? (

                  <section className="monitoring-score-grid">

                    <article className="panel monitoring-score-card">

                      <span>
                        WHO-5 Well-Being
                      </span>

                      <strong>
                        {
                          latestResults
                            ?.who5
                            ?.percentageScore ??
                          "—"
                        }
                        /100
                      </strong>

                      <small>
                        Raw:
                        {" "}
                        {
                          latestResults
                            ?.who5
                            ?.rawScore ??
                          "—"
                        }
                        /25
                      </small>

                      <p>
                        {
                          latestResults
                            ?.who5
                            ?.interpretation ||
                          "No interpretation available."
                        }
                      </p>

                    </article>


                    <article className="panel monitoring-score-card">

                      <span>
                        PHQ-9
                      </span>

                      <strong>
                        {
                          latestResults
                            ?.phq9
                            ?.totalScore ??
                          "—"
                        }
                        /27
                      </strong>

                      <small>
                        {
                          latestResults
                            ?.phq9
                            ?.severity ||
                          "No severity available"
                        }
                      </small>

                    </article>


                    <article className="panel monitoring-score-card">

                      <span>
                        GAD-7
                      </span>

                      <strong>
                        {
                          latestResults
                            ?.gad7
                            ?.totalScore ??
                          "—"
                        }
                        /21
                      </strong>

                      <small>
                        {
                          latestResults
                            ?.gad7
                            ?.severity ||
                          "No severity available"
                        }
                      </small>

                    </article>


                    {latestResults
                      ?.dass21
                      ?.depression

                      ? (

                        <>

                          <article className="panel monitoring-score-card">

                            <span>
                              DASS-21 Depression
                            </span>

                            <strong>
                              {
                                latestResults
                                  .dass21
                                  .depression
                                  .adjustedScore
                              }
                              /42
                            </strong>

                            <small>
                              Raw:
                              {" "}
                              {
                                latestResults
                                  .dass21
                                  .depression
                                  .rawScore
                              }
                              /21
                            </small>

                          </article>


                          <article className="panel monitoring-score-card">

                            <span>
                              DASS-21 Anxiety
                            </span>

                            <strong>
                              {
                                latestResults
                                  .dass21
                                  .anxiety
                                  .adjustedScore
                              }
                              /42
                            </strong>

                            <small>
                              Raw:
                              {" "}
                              {
                                latestResults
                                  .dass21
                                  .anxiety
                                  .rawScore
                              }
                              /21
                            </small>

                          </article>


                          <article className="panel monitoring-score-card">

                            <span>
                              DASS-21 Stress
                            </span>

                            <strong>
                              {
                                latestResults
                                  .dass21
                                  .stress
                                  .adjustedScore
                              }
                              /42
                            </strong>

                            <small>
                              Raw:
                              {" "}
                              {
                                latestResults
                                  .dass21
                                  .stress
                                  .rawScore
                              }
                              /21
                            </small>

                          </article>

                        </>

                      )

                      : (

                        <article className="panel monitoring-score-card">

                          <span>
                            DASS-21 Legacy Total
                          </span>

                          <strong>
                            {
                              latestResults
                                ?.dass21
                                ?.totalScore ??
                              "—"
                            }
                            /63
                          </strong>

                          <small>
                            Older record without separate subscale scores
                          </small>

                        </article>

                      )
                    }

                  </section>

                )

                : (

                  <section className="panel">

                    <div className="notice">
                      This counselor-reviewed record is an older assessment. Detailed standardized instrument results are not available for this record.
                    </div>

                  </section>

                )
              }


              <section className="panel monitoring-guidance-panel">

                <h2>
                  Monitoring Guidance
                </h2>

                <p>
                  {
                    latest.recommendation ||
                    "Continue monitoring your well-being and contact the Guidance and Counseling Unit if you need support."
                  }
                </p>


                <div className="notice">
                  MindTrack displays screening and monitoring information only. These results are not a medical or psychological diagnosis. A Guidance Counselor should interpret concerns together with your situation and professional assessment.
                </div>

              </section>


              <section className="panel">

                <div className="monitoring-history-heading">

                  <div>

                    <h2>
                      Counselor-Reviewed Assessment History
                    </h2>

                    <p>
                      Only counselor-reviewed assessments are used in your current state and monitoring trend. Newest reviewed assessment first.
                    </p>

                  </div>


                  <button

                    type="button"

                    className="secondary-button"

                    onClick={
                      () =>
                        navigate(
                          "/assessment"
                        )
                    }

                  >
                    Take another assessment
                  </button>

                </div>


                <div className="monitoring-history-list">

                  {reviewedAssessments.map(
                    row => (

                      <article

                        id={
                          `monitoring-assessment-${row.id}`
                        }

                        key={
                          row.id
                        }

                        className={
                          row.id ===
                            requestedAssessmentId
                            ? "monitoring-history-card notification-target-highlight"
                            : "monitoring-history-card"
                        }

                      >

                        <div>

                          <strong>
                            {
                              formatRecordDateTime(
                                row.createdAt
                              )
                            }
                          </strong>

                          <small>
                            {
                              assessmentCaseStatusLabel(
                                row.status
                              )
                            }
                          </small>

                        </div>


                        <span
                          className={
                            priorityClassName(
                              row.priority
                            )
                          }
                        >
                          {
                            row.priority ||
                            "No priority"
                          }
                        </span>


                        <div className="monitoring-history-scores">

                          <span>
                            WHO-5:
                            {" "}
                            {
                              row.instrumentResults
                                ?.who5
                                ?.percentageScore ??
                              row.score ??
                              "—"
                            }
                          </span>

                          <span>
                            PHQ-9:
                            {" "}
                            {
                              row.instrumentResults
                                ?.phq9
                                ?.totalScore ??
                              "—"
                            }
                          </span>

                          <span>
                            GAD-7:
                            {" "}
                            {
                              row.instrumentResults
                                ?.gad7
                                ?.totalScore ??
                              "—"
                            }
                          </span>

                          {row.instrumentResults
                            ?.dass21
                            ?.depression

                            ? (

                              <>

                                <span>
                                  DASS-D:
                                  {" "}
                                  {
                                    row.instrumentResults
                                      .dass21
                                      .depression
                                      .adjustedScore
                                  }
                                </span>

                                <span>
                                  DASS-A:
                                  {" "}
                                  {
                                    row.instrumentResults
                                      .dass21
                                      .anxiety
                                      .adjustedScore
                                  }
                                </span>

                                <span>
                                  DASS-S:
                                  {" "}
                                  {
                                    row.instrumentResults
                                      .dass21
                                      .stress
                                      .adjustedScore
                                  }
                                </span>

                              </>

                            )

                            : (

                              <span>
                                DASS-21 legacy total:
                                {" "}
                                {
                                  row.instrumentResults
                                    ?.dass21
                                    ?.totalScore ??
                                  "—"
                                }
                              </span>

                            )
                          }

                        </div>

                      </article>

                    )
                  )}

                </div>

              </section>


              {pendingAssessments.length > 0 && (

                <section className="panel monitoring-pending-panel">

                  <h2>
                    Awaiting Counselor Review
                  </h2>

                  <p>
                    These assessments are not included in your current state or trend until a Guidance Counselor reviews them.
                  </p>


                  <div className="monitoring-pending-list">

                    {pendingAssessments.map(
                      row => (

                        <div
                          key={
                            row.id
                          }
                          className="monitoring-pending-item"
                        >

                          <strong>
                            {
                              formatRecordDateTime(
                                row.createdAt
                              )
                            }
                          </strong>

                          <span>
                            Awaiting counselor review
                          </span>

                        </div>

                      )
                    )}

                  </div>

                </section>

              )}

            </>

          )
      }

    </>

  );
}


// ======================================================
// HISTORY
// ======================================================

function History() {

  const { user } =
    useAuth();


  const assessments =
    useRows(
      "assessments",
      {
        ownerId:
          user.id
      }
    );


  const consultations =
    useRows(
      "consultations",
      {
        ownerId:
          user.id
      }
    );


  return (

    <>

      <PageTitle

        title="History"

        subtitle="Your own assessment and counseling request records."

      />


      <section className="panel">

        <h2>
          Assessments
        </h2>


        <CaseTable
          rows={assessments}
          personal
        />

      </section>


      <section className="panel">

        <h2>
          Counseling Requests
        </h2>


        {consultations.length === 0

          ? (

            <Empty
              text="No counseling request records yet."
            />

          )

          : consultations.map(
              row => (

                <article
                  key={
                    row.id
                  }
                  className="record-card"
                >

                  <strong>
                    {
                      row.category
                    }
                  </strong>

                  <span className="status">
                    {
                      row.status
                    }
                  </span>

                  <p>

                    {
                      row.date
                    }

                    {" · "}

                    {
                      row.time
                    }

                  </p>


                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "#f7f9fc",
                      border: "1px solid #dfe5ef"
                    }}
                  >

                    <strong
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#173f8f"
                      }}
                    >
                      Counselor Remarks
                    </strong>

                    <span
                      style={{
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      {
                        row.counselorRemarks?.trim() ||
                        "No counselor remarks yet."
                      }
                    </span>

                  </div>

                </article>

              )
            )
        }

      </section>

    </>

  );
}


// ======================================================
// CASE MANAGEMENT
// ======================================================

function Cases() {

  const { user } =
    useAuth();


  const isSuperAdmin =
    user.role ===
    "super_admin";


  const assessmentFilters =
    isSuperAdmin
      ? {}
      : {
          department:
            user.department
        };


  const departmentAssessmentRows =
    useRows(
      "assessments",
      assessmentFilters
    );


  const transferredAssessmentRows =
    useTransferredOwnerRows(
      "assessments",
      isSuperAdmin
        ? ""
        : user.id
    );


  const rows =
    useMemo(
      () =>
        isSuperAdmin
          ? departmentAssessmentRows
          : mergeRowsById(
              departmentAssessmentRows,
              transferredAssessmentRows
            ),
      [
        isSuperAdmin,
        departmentAssessmentRows,
        transferredAssessmentRows
      ]
    );


  const departmentConsultationRows =
    useRows(
      "consultations",
      isSuperAdmin
        ? {
            ownerId:
              "__NO_ACCESS__"
          }
        : {
            department:
              user.department
          }
    );


  const assignedConsultationRows =
    useRows(
      "consultations",
      isSuperAdmin
        ? {
            ownerId:
              "__NO_ACCESS__"
          }
        : {
            assignedCounselorId:
              user.id
          }
    );


  const counselingAssignmentMap =
    useMemo(
      () => {

        const map = {};


        mergeRowsById(
          departmentConsultationRows,
          assignedConsultationRows
        ).forEach(
          consultation => {

            if (
              !consultation.ownerId ||
              !consultation.assignedCounselorId
            ) {

              return;
            }


            const current =
              map[
                consultation.ownerId
              ];


            const consultationDate =
              recordDateObject(
                consultation.updatedAt ||
                consultation.transferredAt ||
                consultation.createdAt
              );


            const currentDate =
              current
                ? recordDateObject(
                    current.updatedAt ||
                    current.transferredAt ||
                    current.createdAt
                  )
                : null;


            if (
              !current ||
              (
                consultationDate
                  ?.getTime() ||
                0
              ) >=
              (
                currentDate
                  ?.getTime() ||
                0
              )
            ) {

              map[
                consultation.ownerId
              ] =
                consultation;
            }
          }
        );


        return map;
      },

      [
        departmentConsultationRows,
        assignedConsultationRows
      ]
    );


  function assessmentIsReadOnly(
    row
  ) {

    if (
      isSuperAdmin ||
      user.role !==
        "counselor"
    ) {

      return false;
    }


    const assignment =
      counselingAssignmentMap[
        row?.ownerId
      ];


    return Boolean(
      assignment
        ?.assignedCounselorId &&
      assignment
        .assignedCounselorId !==
        user.id
    );
  }


  function ownerKey(
    row
  ) {

    if (row.ownerId) {
      return row.ownerId;
    }


    return [
      "legacy",
      row.ownerName || "unknown",
      row.department || "unknown",
      row.program || "unknown"
    ].join("::");
  }


  function assessmentDateValue(
    row
  ) {

    const date =
      recordDateObject(
        row.createdAt
      );


    return date
      ? date.getTime()
      : 0;
  }


  const groupedCases =
    new Map();


  rows.forEach(
    row => {

      const key =
        ownerKey(row);


      if (
        !groupedCases.has(
          key
        )
      ) {

        groupedCases.set(
          key,
          []
        );
      }


      groupedCases
        .get(key)
        .push(row);
    }
  );


  const accountCaseRows =
    Array.from(
      groupedCases.entries()
    )
      .map(
        ([
          key,
          history
        ]) => {

          const sortedHistory =
            [...history]
              .sort(
                (a, b) =>
                  assessmentDateValue(b) -
                  assessmentDateValue(a)
              );


          const latest =
            sortedHistory[0];


          return {
            ...latest,

            assessmentOwnerKey:
              key,

            assessmentCount:
              sortedHistory.length
          };
        }
      )
      .sort(
        (a, b) =>
          assessmentDateValue(b) -
          assessmentDateValue(a)
      );


  const [
    collegeFilter,
    setCollegeFilter
  ] = useState("all");


  const [
    programFilter,
    setProgramFilter
  ] = useState("all");


  const [
    priorityFilter,
    setPriorityFilter
  ] = useState("all");


  const caseCollegeOptions =
    Array.from(
      new Set(
        accountCaseRows.map(
          row =>
            counselorCollegeLabel(
              row.department
            )
        )
      )
    )
      .sort(
        (a, b) =>
          a.localeCompare(b)
      );


  const caseRowsForProgramOptions =
    accountCaseRows.filter(
      row => {

        if (
          !isSuperAdmin ||
          collegeFilter === "all"
        ) {

          return true;
        }


        return (
          counselorCollegeLabel(
            row.department
          ) ===
          collegeFilter
        );
      }
    );


  const caseProgramOptions =
    Array.from(
      new Set(
        caseRowsForProgramOptions.map(
          row =>
            counselorProgramLabel(
              row.program
            )
        )
      )
    )
      .sort(
        (a, b) =>
          a.localeCompare(b)
      );


  const filteredCaseRows =
    accountCaseRows.filter(
      row => {

        const college =
          counselorCollegeLabel(
            row.department
          );


        const program =
          counselorProgramLabel(
            row.program
          );


        const priority =
          String(
            row.priority || ""
          ).trim() ||
          "No Assessment";


        const matchesCollege =
          !isSuperAdmin ||
          collegeFilter === "all" ||
          college ===
            collegeFilter;


        const matchesProgram =
          programFilter === "all" ||
          program ===
            programFilter;


        const matchesPriority =
          priorityFilter === "all" ||
          priority ===
            priorityFilter;


        return (
          matchesCollege &&
          matchesProgram &&
          matchesPriority
        );
      }
    );


  const [
    selectedOwnerKey,
    setSelectedOwnerKey
  ] = useState("");


  const [
    selected,
    setSelected
  ] = useState(null);


  const [
    statusDraft,
    setStatusDraft
  ] = useState("For review");


  const [
    remarksDraft,
    setRemarksDraft
  ] = useState("");


  const [
    savingCase,
    setSavingCase
  ] = useState(false);


  const assessmentStatuses = [
    "For review",
    "Counseling is recommended",
    "Follow up is recommended",
    "Counseling is optional",
    "Approved"
  ];


  const selectedHistory =
    selectedOwnerKey
      ? rows
          .filter(
            row =>
              ownerKey(row) ===
              selectedOwnerKey
          )
          .sort(
            (a, b) =>
              assessmentDateValue(b) -
              assessmentDateValue(a)
          )
      : [];


  function selectAssessmentVersion(
    row
  ) {

    setSelected(row);


    const normalizedStatus =
      assessmentCaseStatusLabel(
        row.status
      );


    setStatusDraft(
      assessmentStatuses.includes(
        normalizedStatus
      )
        ? normalizedStatus
        : "For review"
    );


    setRemarksDraft(
      row.counselorRemarks ||
      ""
    );

  }


  function selectAssessmentAccount(
    row
  ) {

    setSelectedOwnerKey(
      row.assessmentOwnerKey ||
      ownerKey(row)
    );


    selectAssessmentVersion(
      row
    );
  }


  function closeAssessmentReview() {

    setSelected(null);
    setSelectedOwnerKey("");
  }


  useEffect(
    () => {

      if (!selected) {
        return undefined;
      }


      const previousOverflow =
        document.body.style.overflow;


      function closeOnEscape(
        event
      ) {

        if (
          event.key ===
          "Escape"
        ) {

          closeAssessmentReview();
        }
      }


      document.body.style.overflow =
        "hidden";


      window.addEventListener(
        "keydown",
        closeOnEscape
      );


      return () => {

        document.body.style.overflow =
          previousOverflow;


        window.removeEventListener(
          "keydown",
          closeOnEscape
        );
      };

    },

    [selected]
  );


  async function saveAssessmentUpdate() {

    if (!selected) {
      return;
    }


    if (
      assessmentIsReadOnly(
        selected
      )
    ) {

      alert(
        "This user is currently assigned to another counselor. You may view the assessment record, but only the assigned counselor can change its status or remarks."
      );

      return;
    }


    try {

      setSavingCase(true);


      const assessmentChanged =
        selected.status !==
          statusDraft ||
        String(
          selected.counselorRemarks ||
          ""
        ) !==
          String(
            remarksDraft ||
            ""
          );


      const assessmentUpdate = {

        counselorRemarks:
          remarksDraft,

        status:
          statusDraft

      };


      if (
        user.role ===
        "counselor"
      ) {

        assessmentUpdate.reviewed =
          statusDraft !==
          "For review";


        assessmentUpdate.reviewedById =
          user.id;


        assessmentUpdate.reviewedByName =
          user.name ||
          "Guidance Counselor";


        assessmentUpdate.reviewedByRole =
          "counselor";
      }


      await updateRecord(
        "assessments",
        selected.id,
        assessmentUpdate
      );


      let notificationSent =
        true;


      if (
        assessmentChanged &&
        selected.ownerId &&
        user.role === "counselor"
      ) {

        try {

          await addRecord(
            "notifications",
            {

              ownerId:
                selected.ownerId,

              title:
                "Assessment case updated by counselor",

              message:
                `Your counselor updated your psychological assessment case. Status: ${statusDraft}.${remarksDraft.trim() ? " A counselor remark is available." : ""}`,

              notificationType:
                "counselor_update",

              senderRole:
                "counselor",

              senderId:
                user.id,

              senderName:
                user.name ||
                "Guidance Counselor",

              targetPath:
                "/monitoring",

              sourceType:
                "assessment",

              sourceId:
                selected.id,

              read:
                false

            }
          );

        } catch (
          notificationError
        ) {

          notificationSent =
            false;


          console.error(
            "Unable to send assessment update notification:",
            notificationError
          );
        }
      }


      setSelected(
        current => ({
          ...current,

          counselorRemarks:
            remarksDraft,

          status:
            statusDraft,

          ...(user.role ===
            "counselor"
            ? {
                reviewed:
                  statusDraft !==
                  "For review",

                reviewedById:
                  user.id,

                reviewedByName:
                  user.name ||
                  "Guidance Counselor",

                reviewedByRole:
                  "counselor"
              }
            : {})
        })
      );


      alert(
        notificationSent
          ? "Psychological assessment case updated successfully."
          : "The assessment case was updated, but the user notification could not be sent."
      );

    } catch (err) {

      console.error(
        "Psychological assessment case update error:",
        err
      );


      alert(
        err?.message ||
        "Unable to update the psychological assessment case."
      );

    } finally {

      setSavingCase(false);
    }
  }


  function renderHistoryScores(
    row
  ) {

    if (!row.instrumentResults) {

      return (

        <div className="assessment-history-score-list">

          <span>
            Legacy score:
            {" "}
            {
              row.score ??
              "—"
            }
          </span>

        </div>

      );
    }


    const dass =
      row.instrumentResults
        ?.dass21;


    return (

      <div className="assessment-history-score-list">

        <span>
          WHO-5:
          {" "}
          {
            row.instrumentResults
              ?.who5
              ?.percentageScore ??
            "—"
          }/100
        </span>


        <span>
          PHQ-9:
          {" "}
          {
            row.instrumentResults
              ?.phq9
              ?.totalScore ??
            "—"
          }/27
        </span>


        <span>
          GAD-7:
          {" "}
          {
            row.instrumentResults
              ?.gad7
              ?.totalScore ??
            "—"
          }/21
        </span>


        {dass?.depression

          ? (

            <>

              <span>
                DASS-D:
                {" "}
                {
                  dass.depression
                    .adjustedScore
                }/42
              </span>

              <span>
                DASS-A:
                {" "}
                {
                  dass.anxiety
                    .adjustedScore
                }/42
              </span>

              <span>
                DASS-S:
                {" "}
                {
                  dass.stress
                    .adjustedScore
                }/42
              </span>

            </>

          )

          : (

            <span>
              DASS-21:
              {" "}
              {
                dass?.totalScore ??
                "—"
              }/63
            </span>

          )
        }

      </div>

    );
  }


  return (

    <>

      <PageTitle

        title={
          isSuperAdmin
            ? "All Psychological Assessment Cases"
            : "Psychological Assessment Cases"
        }

        subtitle="One account is shown per user. Open Review to see the user's complete assessment history and manage individual assessment records."

      />


      <section className="panel counselor-filter-panel">

        <div className="counselor-filter-heading">

          <div>

            <h2>
              Filter Assessment Cases
            </h2>

            <p>
              {
                isSuperAdmin
                  ? "Filter user cases by college, program, and latest monitoring priority."
                  : "Filter user cases by program and latest monitoring priority."
              }
            </p>

          </div>


          <span className="counselor-filter-count">
            {
              filteredCaseRows.length
            }
            {" "}
            of
            {" "}
            {
              accountCaseRows.length
            }
            {" "}
            accounts
          </span>

        </div>


        <div
          className={
            isSuperAdmin
              ? "counselor-filter-grid three-columns"
              : "counselor-filter-grid"
          }
        >

          {isSuperAdmin && (

            <label>

              College / Office

              <select
                value={collegeFilter}
                onChange={
                  event => {

                    setCollegeFilter(
                      event.target.value
                    );

                    setProgramFilter(
                      "all"
                    );
                  }
                }
              >

                <option value="all">
                  All colleges / offices
                </option>

                {caseCollegeOptions.map(
                  college => (

                    <option
                      key={college}
                      value={college}
                    >
                      {college}
                    </option>

                  )
                )}

              </select>

            </label>

          )}


          <label>

            Program

            <select
              value={programFilter}
              onChange={
                event =>
                  setProgramFilter(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All programs
              </option>

              {caseProgramOptions.map(
                program => (

                  <option
                    key={program}
                    value={program}
                  >
                    {program}
                  </option>

                )
              )}

            </select>

          </label>


          <label>

            Priority

            <select
              value={priorityFilter}
              onChange={
                event =>
                  setPriorityFilter(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All priorities
              </option>

              <option value="Low">
                Low
              </option>

              <option value="Moderate">
                Moderate
              </option>

              <option value="High">
                High
              </option>

              <option value="Critical">
                Critical
              </option>

              <option value="No Assessment">
                No priority
              </option>

            </select>

          </label>

        </div>

      </section>


      <section className="panel">

        <h2>
          Assessment Cases
        </h2>


        <AssessmentAccountTable

          rows={
            filteredCaseRows
          }

          onSelect={
            selectAssessmentAccount
          }

          showCollege={
            isSuperAdmin
          }

        />

      </section>


      {selected && (

        <div

          className="review-request-modal-backdrop"

          role="presentation"

          onMouseDown={
            event => {

              if (
                event.target ===
                event.currentTarget
              ) {

                closeAssessmentReview();
              }
            }
          }

        >

          <section

            className="review-request-modal assessment-history-review-modal"

            role="dialog"

            aria-modal="true"

            aria-label={
              `Review psychological assessment history for ${
                selected.ownerName ||
                "user"
              }`
            }

          >

            <header className="review-request-modal-header">

              <div>

                <p className="review-request-modal-eyebrow">
                  Psychological Assessment Case
                </p>


                <div className="review-request-modal-title-row">

                  <h2>
                    {
                      selected.ownerName ||
                      "User"
                    }
                  </h2>


                  <span
                    className={
                      priorityClassName(
                        selected.priority
                      )
                    }
                  >

                    {
                      selected.priority ||
                      "No priority"
                    }

                  </span>

                </div>


                <p className="review-request-modal-subtitle">
                  {
                    selectedHistory.length
                  }
                  {" "}
                  assessment
                  {
                    selectedHistory.length === 1
                      ? ""
                      : "s"
                  }
                  {" "}
                  recorded for this account. Select an assessment below to view its scores, details, and review status.
                </p>

              </div>


              <button

                type="button"

                className="review-request-close-button"

                onClick={
                  closeAssessmentReview
                }

                aria-label="Close psychological assessment review"

                title="Close"

              >
                ×
              </button>

            </header>


            <div className="review-request-modal-body assessment-history-review-body">

              <section className="review-request-modal-card assessment-user-history-card">

                <div className="assessment-history-heading">

                  <div>

                    <h3>
                      Assessment History
                    </h3>

                    <p>
                      Newest assessment first. Scores are kept here instead of the main case list.
                    </p>

                  </div>

                </div>


                <div className="assessment-history-list">

                  {selectedHistory.map(
                    row => (

                      <button

                        type="button"

                        key={
                          row.id
                        }

                        className={
                          row.id ===
                            selected.id
                            ? "assessment-history-item active"
                            : "assessment-history-item"
                        }

                        onClick={
                          () =>
                            selectAssessmentVersion(
                              row
                            )
                        }

                      >

                        <div className="assessment-history-item-top">

                          <div>

                            <strong>
                              {
                                formatRecordDateTime(
                                  row.createdAt
                                )
                              }
                            </strong>

                            <small>
                              {
                                assessmentCaseStatusLabel(
                                  row.status
                                )
                              }
                            </small>

                          </div>


                          <span
                            className={
                              priorityClassName(
                                row.priority
                              )
                            }
                          >
                            {
                              row.priority ||
                              "No priority"
                            }
                          </span>

                        </div>


                        {
                          renderHistoryScores(
                            row
                          )
                        }


                        <span className="assessment-history-open-label">
                          {
                            row.id ===
                              selected.id
                              ? "Currently viewing"
                              : "View this assessment"
                          }
                        </span>

                      </button>

                    )
                  )}

                </div>

              </section>


              <section className="review-request-modal-card assessment-selected-detail-card">

                <div className="assessment-selected-detail-heading">

                  <div>

                    <h3>
                      Selected Assessment Details
                    </h3>

                    <p>
                      {
                        formatRecordDateTime(
                          selected.createdAt
                        )
                      }
                    </p>

                  </div>

                </div>


                {selected.instrumentResults

                  ? (

                    <>

                      <div className="assessment-review-score-grid">

                        <div className="review-request-detail-item">

                          <span>
                            WHO-5
                          </span>

                          <strong>
                            {
                              selected.instrumentResults
                                ?.who5
                                ?.percentageScore
                            }/100
                          </strong>

                          <small>
                            Raw:
                            {" "}
                            {
                              selected.instrumentResults
                                ?.who5
                                ?.rawScore
                            }/25
                          </small>

                          <p>
                            {
                              selected.instrumentResults
                                ?.who5
                                ?.interpretation
                            }
                          </p>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            PHQ-9
                          </span>

                          <strong>
                            {
                              selected.instrumentResults
                                ?.phq9
                                ?.totalScore
                            }/27
                          </strong>

                          <small>
                            {
                              selected.instrumentResults
                                ?.phq9
                                ?.severity
                            }
                            {" "}
                            symptom range
                          </small>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            GAD-7
                          </span>

                          <strong>
                            {
                              selected.instrumentResults
                                ?.gad7
                                ?.totalScore
                            }/21
                          </strong>

                          <small>
                            {
                              selected.instrumentResults
                                ?.gad7
                                ?.severity
                            }
                            {" "}
                            symptom range
                          </small>

                        </div>


                        {selected.instrumentResults
                          ?.dass21
                          ?.depression

                          ? (

                            <>

                              <div className="review-request-detail-item">

                                <span>
                                  DASS-21 Depression
                                </span>

                                <strong>
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .depression
                                      .adjustedScore
                                  }/42
                                </strong>

                                <small>
                                  Raw:
                                  {" "}
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .depression
                                      .rawScore
                                  }/21
                                </small>

                              </div>


                              <div className="review-request-detail-item">

                                <span>
                                  DASS-21 Anxiety
                                </span>

                                <strong>
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .anxiety
                                      .adjustedScore
                                  }/42
                                </strong>

                                <small>
                                  Raw:
                                  {" "}
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .anxiety
                                      .rawScore
                                  }/21
                                </small>

                              </div>


                              <div className="review-request-detail-item">

                                <span>
                                  DASS-21 Stress
                                </span>

                                <strong>
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .stress
                                      .adjustedScore
                                  }/42
                                </strong>

                                <small>
                                  Raw:
                                  {" "}
                                  {
                                    selected.instrumentResults
                                      .dass21
                                      .stress
                                      .rawScore
                                  }/21
                                </small>

                              </div>

                            </>

                          )

                          : (

                            <div className="review-request-detail-item">

                              <span>
                                DASS-21 Legacy Total
                              </span>

                              <strong>
                                {
                                  selected.instrumentResults
                                    ?.dass21
                                    ?.totalScore ??
                                  "—"
                                }/63
                              </strong>

                              <small>
                                Older record without separate subscale scores
                              </small>

                            </div>

                          )
                        }

                      </div>


                      <div className="review-request-detail-grid assessment-review-meta-grid">

                        <div className="review-request-detail-item">

                          <span>
                            MindTrack Monitoring Priority
                          </span>

                          <strong>
                            {
                              selected.priority ||
                              "Not available"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            PHQ-9 Functional Difficulty
                          </span>

                          <strong>
                            {
                              selected.instrumentResults
                                ?.phq9
                                ?.difficulty ||
                              selected.phq9Difficulty ||
                              "Not provided"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            College / Office
                          </span>

                          <strong>
                            {
                              selected.department ||
                              "Not provided"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            Program
                          </span>

                          <strong>
                            {
                              selected.program ||
                              "Not provided"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item full">

                          <span>
                            Monitoring Recommendation
                          </span>

                          <strong className="review-request-details-text">
                            {
                              selected.recommendation ||
                              "No recommendation available."
                            }
                          </strong>

                        </div>


                        {selected.notes && (

                          <div className="review-request-detail-item full">

                            <span>
                              User's Additional Notes
                            </span>

                            <strong className="review-request-details-text">
                              {
                                selected.notes
                              }
                            </strong>

                          </div>

                        )}

                      </div>

                    </>

                  )

                  : (

                    <div className="review-request-detail-grid">

                      <div className="review-request-detail-item">

                        <span>
                          Legacy Monitoring Score
                        </span>

                        <strong>
                          {
                            selected.score ??
                            "Not available"
                          }

                          {
                            selected.score !==
                            undefined &&
                            selected.score !==
                            null
                              ? "/100"
                              : ""
                          }
                        </strong>

                      </div>


                      <div className="review-request-detail-item">

                        <span>
                          Priority Level
                        </span>

                        <strong>
                          {
                            selected.priority ||
                            "Not available"
                          }
                        </strong>

                      </div>


                      <div className="review-request-detail-item">

                        <span>
                          College / Office
                        </span>

                        <strong>
                          {
                            selected.department ||
                            "Not provided"
                          }
                        </strong>

                      </div>


                      <div className="review-request-detail-item">

                        <span>
                          Program
                        </span>

                        <strong>
                          {
                            selected.program ||
                            "Not provided"
                          }
                        </strong>

                      </div>


                      <div className="review-request-detail-item full">

                        <span>
                          System Recommendation
                        </span>

                        <strong className="review-request-details-text">
                          {
                            selected.recommendation ||
                            "No recommendation available."
                          }
                        </strong>

                      </div>


                      {selected.notes && (

                        <div className="review-request-detail-item full">

                          <span>
                            User's Additional Notes
                          </span>

                          <strong className="review-request-details-text">
                            {
                              selected.notes
                            }
                          </strong>

                        </div>

                      )}

                    </div>

                  )
                }

              </section>


              <section className="review-request-modal-card review-request-update-card assessment-case-update-card">

                <h3>
                  {
                    isSuperAdmin
                      ? "Case Review"
                      : "Counselor Review"
                  }
                </h3>


                <p className="assessment-review-record-note">
                  Changes below apply only to the currently selected assessment dated
                  {" "}
                  {
                    formatRecordDateTime(
                      selected.createdAt
                    )
                  }.
                </p>


                {assessmentIsReadOnly(
                  selected
                ) && (

                  <div className="notice">
                    Read-only assessment record: this user is assigned to another counselor. You can review the assessment history and scores, but you cannot change the status or counselor remarks.
                  </div>

                )}


                <label>

                  Status

                  <select

                    value={
                      statusDraft
                    }

                    disabled={
                      assessmentIsReadOnly(
                        selected
                      )
                    }

                    onChange={
                      event =>
                        setStatusDraft(
                          event.target.value
                        )
                    }

                  >

                    {assessmentStatuses.map(
                      status => (

                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>

                      )
                    )}

                  </select>

                </label>


                <label>

                  {
                    isSuperAdmin
                      ? "Case remarks"
                      : "Counselor remarks"
                  }

                  <textarea

                    rows="9"

                    value={
                      remarksDraft
                    }

                    readOnly={
                      assessmentIsReadOnly(
                        selected
                      )
                    }

                    onChange={
                      event =>
                        setRemarksDraft(
                          event.target.value
                        )
                    }

                    placeholder="Add remarks, recommendations, or instructions."

                  />

                </label>


                <div className="review-request-modal-actions">

                  <button

                    type="button"

                    className="secondary-button"

                    onClick={
                      closeAssessmentReview
                    }

                  >
                    Close
                  </button>


                  <button

                    type="button"

                    className="primary-button"

                    disabled={
                      savingCase ||
                      assessmentIsReadOnly(
                        selected
                      )
                    }

                    onClick={
                      saveAssessmentUpdate
                    }

                  >

                    {
                      assessmentIsReadOnly(
                        selected
                      )
                        ? "Read only"
                        : savingCase
                          ? "Saving..."
                          : "Save case update"
                    }

                  </button>

                </div>

              </section>

            </div>

          </section>

        </div>

      )}

    </>

  );
}


// ======================================================
// COUNSELING REQUEST MANAGEMENT
// Counselor / Super Admin
// ======================================================

function CounselingRequestsManagement() {

  const { user } =
    useAuth();


  const location =
    useLocation();


  const navigate =
    useNavigate();


  const allowedRoles = [
    "counselor",
    "super_admin"
  ];


  const hasAccess =
    allowedRoles.includes(
      user.role
    );


  const isSuperAdmin =
    user.role ===
    "super_admin";


  // Once a user has an assigned counselor, only that
  // counselor may change the user's counseling records.
  // Former counselors keep read-only access for continuity.
  function requestIsReadOnly(
    row
  ) {

    if (
      user.role !==
        "counselor"
    ) {

      return false;
    }


    const latestApprovedTransfer =
      transferRequests.find(
        transfer =>
          transfer.ownerId ===
            row?.ownerId &&
          transfer.status ===
            "Approved" &&
          transfer.acceptedById
      );


    if (latestApprovedTransfer) {

      return (
        latestApprovedTransfer
          .acceptedById !==
        user.id
      );
    }


    const counselingProfile =
      caseProfileMap[
        row?.ownerId
      ];


    if (
      counselingProfile
        ?.assignedCounselorId
    ) {

      return (
        counselingProfile
          .assignedCounselorId !==
        user.id
      );
    }


    if (
      row
        ?.assignedCounselorId
    ) {

      return (
        row.assignedCounselorId !==
        user.id
      );
    }


    return false;
  }


  const departmentConsultations =
    useRows(
      "consultations",
      !hasAccess
        ? {
            ownerId:
              "__NO_ACCESS__"
          }
        : isSuperAdmin
          ? {}
          : {
              department:
                user.department
            }
    );


  const assignedConsultations =
    useRows(
      "consultations",
      !hasAccess ||
      isSuperAdmin
        ? {
            ownerId:
              "__NO_ACCESS__"
          }
        : {
            assignedCounselorId:
              user.id
          }
    );


  const transferredOwnerConsultations =
    useTransferredOwnerRows(
      "consultations",
      !hasAccess ||
      isSuperAdmin
        ? ""
        : user.id
    );


  const rows =
    useMemo(
      () =>
        isSuperAdmin
          ? departmentConsultations
          : mergeRowsById(
              departmentConsultations,
              assignedConsultations,
              transferredOwnerConsultations
            ),
      [
        isSuperAdmin,
        departmentConsultations,
        assignedConsultations,
        transferredOwnerConsultations
      ]
    );


  const departmentCaseProfiles =
    useRows(
      "counselingProfiles",
      {},
      Boolean(
        hasAccess &&
        isSuperAdmin
      )
    );


  const assignedCaseProfiles =
    useRows(
      "counselingProfiles",
      {
        assignedCounselorId:
          user.id
      },
      Boolean(
        hasAccess &&
        !isSuperAdmin
      )
    );


  const caseProfileMap =
    useMemo(
      () => {

        const map = {};


        mergeRowsById(
          departmentCaseProfiles,
          assignedCaseProfiles
        ).forEach(
          counselingProfile => {

            const ownerId =
              counselingProfile.ownerId ||
              counselingProfile.id;


            if (ownerId) {

              map[
                ownerId
              ] =
                counselingProfile;
            }
          }
        );


        return map;
      },

      [
        departmentCaseProfiles,
        assignedCaseProfiles
      ]
    );


  const departmentAssessmentRows =
    useRows(
      "assessments",
      !hasAccess
        ? {
            ownerId:
              "__NO_ACCESS__"
          }
        : isSuperAdmin
          ? {}
          : {
              department:
                user.department
            }
    );


  const transferredAssessmentRows =
    useTransferredOwnerRows(
      "assessments",
      !hasAccess ||
      isSuperAdmin
        ? ""
        : user.id
    );


  const assessmentRows =
    useMemo(
      () =>
        isSuperAdmin
          ? departmentAssessmentRows
          : mergeRowsById(
              departmentAssessmentRows,
              transferredAssessmentRows
            ),
      [
        isSuperAdmin,
        departmentAssessmentRows,
        transferredAssessmentRows
      ]
    );


  const counselors =
    useRows(
      "users",
      {
        role:
          "counselor"
      }
    );


  const transferRequests =
    useRows(
      "transferRequests"
    );


  const latestAssessmentByOwner =
    useMemo(
      () => {

        const map = {};


        assessmentRows.forEach(
          assessment => {

            const ownerId =
              assessment.ownerId;


            if (
              ownerId &&
              !map[
                ownerId
              ]
            ) {

              map[
                ownerId
              ] = assessment;
            }
          }
        );


        return map;
      },
      [
        assessmentRows
      ]
    );


  const enrichedRows =
    useMemo(
      () =>
        rows.map(
          row => {

            const latestAssessment =
              latestAssessmentByOwner[
                row.ownerId
              ];


            return {

              ...row,

              program:
                row.program ||
                latestAssessment
                  ?.program ||
                "",

              priority:
                latestAssessment
                  ?.priority ||
                "No Assessment"

            };
          }
        ),
      [
        rows,
        latestAssessmentByOwner
      ]
    );


  const [
    collegeFilter,
    setCollegeFilter
  ] = useState("all");


  const [
    programFilter,
    setProgramFilter
  ] = useState("all");


  const [
    priorityFilter,
    setPriorityFilter
  ] = useState("all");


  const requestCollegeOptions =
    Array.from(
      new Set(
        enrichedRows.map(
          row =>
            counselorCollegeLabel(
              row.department
            )
        )
      )
    )
      .sort(
        (a, b) =>
          a.localeCompare(b)
      );


  const requestRowsForProgramOptions =
    enrichedRows.filter(
      row => {

        if (
          !isSuperAdmin ||
          collegeFilter === "all"
        ) {

          return true;
        }


        return (
          counselorCollegeLabel(
            row.department
          ) ===
          collegeFilter
        );
      }
    );


  const requestProgramOptions =
    Array.from(
      new Set(
        requestRowsForProgramOptions.map(
          row =>
            counselorProgramLabel(
              row.program
            )
        )
      )
    )
      .sort(
        (a, b) =>
          a.localeCompare(b)
      );


  const filteredRequestRows =
    enrichedRows.filter(
      row => {

        const college =
          counselorCollegeLabel(
            row.department
          );


        const program =
          counselorProgramLabel(
            row.program
          );


        const priority =
          row.priority ||
          "No Assessment";


        const matchesCollege =
          !isSuperAdmin ||
          collegeFilter === "all" ||
          college ===
            collegeFilter;


        const matchesProgram =
          programFilter === "all" ||
          program ===
            programFilter;


        const matchesPriority =
          priorityFilter === "all" ||
          priority ===
            priorityFilter;


        return (
          matchesCollege &&
          matchesProgram &&
          matchesPriority
        );
      }
    );


  const [selected, setSelected] =
    useState(null);


  const [
    statusDraft,
    setStatusDraft
  ] = useState("");


  const [
    remarksDraft,
    setRemarksDraft
  ] = useState("");


  const [
    caseHistoryDraft,
    setCaseHistoryDraft
  ] = useState("");


  const [
    sessionSummaryDraft,
    setSessionSummaryDraft
  ] = useState("");


  const [
    observationDraft,
    setObservationDraft
  ] = useState("");


  const [
    recommendationsDraft,
    setRecommendationsDraft
  ] = useState("");


  const [
    selectedAccount,
    setSelectedAccount
  ] = useState(null);


  const [
    selectedAccountLoading,
    setSelectedAccountLoading
  ] = useState(false);


  const [
    selectedAccountError,
    setSelectedAccountError
  ] = useState("");


  const [
    saving,
    setSaving
  ] = useState(false);


  const selectedCaseProfile =
    selected
      ? caseProfileMap[
          selected.ownerId
        ] || null
      : null;


  const selectedAssignedCounselorId =
    selectedCaseProfile
      ?.assignedCounselorId ||
    selected
      ?.assignedCounselorId ||
    "";


  const selectedAssignedCounselorDepartment =
    selectedCaseProfile
      ?.assignedCounselorDepartment ||
    selected
      ?.assignedCounselorDepartment ||
    "";


  const isCurrentAssignedCounselor =
    Boolean(
      selected &&
      user.role ===
        "counselor" &&
      selectedAssignedCounselorId ===
        user.id
    );


  const canViewPrivateCaseFields =
    Boolean(
      selected &&
      (
        isSuperAdmin ||
        isCurrentAssignedCounselor
      )
    );


  const canCreatePrivateCaseProfile =
    Boolean(
      selected &&
      isCurrentAssignedCounselor &&
      !selectedCaseProfile &&
      (
        !selectedAssignedCounselorDepartment ||
        normalizedCounselorDepartment(
          selectedAssignedCounselorDepartment
        ) ===
          normalizedCounselorDepartment(
            selected.department
          )
      )
    );


  const canEditPrivateCaseFields =
    Boolean(
      selected &&
      (
        (
          isCurrentAssignedCounselor &&
          (
            Boolean(
              selectedCaseProfile
            ) ||
            canCreatePrivateCaseProfile
          )
        ) ||
        (
          isSuperAdmin &&
          Boolean(
            selectedCaseProfile
          )
        )
      )
    );


  const privateDraftOwnerRef =
    useRef("");


  function resetPrivateCaseDrafts() {

    setCaseHistoryDraft("");

    setSessionSummaryDraft("");

    setObservationDraft("");

    setRecommendationsDraft("");

    privateDraftOwnerRef.current =
      "";
  }


  function initializePrivateCaseDrafts(
    row
  ) {

    const profileData =
      row?.ownerId
        ? caseProfileMap[
            row.ownerId
          ] || null
        : null;


    setCaseHistoryDraft(
      profileData
        ?.caseHistory ||
      profileData
        ?.notes ||
      ""
    );


    setSessionSummaryDraft(
      profileData
        ?.counselingSessionSummary ||
      ""
    );


    setObservationDraft(
      profileData
        ?.counselorObservation ||
      ""
    );


    setRecommendationsDraft(
      profileData
        ?.recommendations ||
      ""
    );


    privateDraftOwnerRef.current =
      profileData
        ? row.ownerId
        : "";
  }


  // Keep modal navigation metadata in refs rather than state.
  // This prevents the Schedule -> Counseling Requests flow from
  // creating a render loop while the request modal is opening.
  const reviewReturnPathRef =
    useRef("");


  const handledRequestNavigationRef =
    useRef("");


  const closingRequestReviewRef =
    useRef(false);


  function closeRequestReview() {

    const destination =
      reviewReturnPathRef.current;


    // Block the route-state opening effect while the close
    // navigation is being processed.
    closingRequestReviewRef.current =
      true;


    reviewReturnPathRef.current =
      "";


    setSelected(null);

    setStatusDraft("");

    setRemarksDraft("");

    resetPrivateCaseDrafts();

    setSelectedAccount(null);

    setSelectedAccountError("");


    if (destination) {

      navigate(
        destination,
        {
          replace: true,
          state: null
        }
      );

      return;
    }


    if (requestedRequestId) {

      navigate(
        location.pathname,
        {
          replace: true,
          state: null
        }
      );
    }
  }


  useEffect(
    () => {

      if (!selected) {
        return undefined;
      }


      const previousOverflow =
        document.body.style.overflow;


      function closeOnEscape(event) {

        if (event.key === "Escape") {
          closeRequestReview();
        }
      }


      document.body.style.overflow =
        "hidden";


      window.addEventListener(
        "keydown",
        closeOnEscape
      );


      return () => {

        document.body.style.overflow =
          previousOverflow;


        window.removeEventListener(
          "keydown",
          closeOnEscape
        );
      };

    },

    [selected]
  );


  useEffect(
    () => {

      let active = true;


      if (
        !selected
          ?.ownerId
      ) {

        setSelectedAccount(null);

        setSelectedAccountError("");

        setSelectedAccountLoading(false);

        return () => {
          active = false;
        };
      }


      setSelectedAccountLoading(true);

      setSelectedAccountError("");


      getDoc(
        doc(
          db,
          "users",
          selected.ownerId
        )
      )
        .then(
          snapshot => {

            if (!active) {
              return;
            }


            if (
              snapshot.exists()
            ) {

              setSelectedAccount({
                id:
                  snapshot.id,

                ...snapshot.data()
              });

            } else {

              setSelectedAccount(null);

              setSelectedAccountError(
                "The user's account record could not be found."
              );
            }
          }
        )
        .catch(
          error => {

            if (!active) {
              return;
            }


            console.error(
              "Unable to load counseling request account information:",
              error
            );


            setSelectedAccount(null);

            setSelectedAccountError(
              error?.message ||
              "Unable to load account information."
            );
          }
        )
        .finally(
          () => {

            if (active) {

              setSelectedAccountLoading(
                false
              );
            }
          }
        );


      return () => {

        active = false;
      };

    },

    [
      selected
        ?.ownerId
    ]
  );


  useEffect(
    () => {

      if (
        !selected
          ?.ownerId ||
        privateDraftOwnerRef
          .current ===
          selected.ownerId
      ) {

        return;
      }


      const profileData =
        caseProfileMap[
          selected.ownerId
        ];


      if (!profileData) {

        return;
      }


      initializePrivateCaseDrafts(
        selected
      );

    },

    [
      selected
        ?.ownerId,
      caseProfileMap
    ]
  );


  const requestedRequestId =
    location.state
      ?.requestId ||
    "";


  const requestedFromSchedule =
    location.state
      ?.fromSchedule ===
    true;


  const requestedNavigationKey =
    location.state
      ?.requestNavigationKey ||
    "";


  useEffect(
    () => {

      if (!requestedRequestId) {

        closingRequestReviewRef.current =
          false;

        return;
      }


      if (
        closingRequestReviewRef.current
      ) {

        return;
      }


      const navigationKey =
        requestedNavigationKey ||
        `${requestedRequestId}:${
          requestedFromSchedule
            ? "schedule"
            : "direct"
        }`;


      if (
        handledRequestNavigationRef.current ===
        navigationKey
      ) {

        return;
      }


      const target =
        enrichedRows.find(
          row =>
            row.id ===
            requestedRequestId
        );


      if (!target) {
        return;
      }


      handledRequestNavigationRef.current =
        navigationKey;


      reviewReturnPathRef.current =
        requestedFromSchedule
          ? "/schedule"
          : "";


      const allowedReviewStatuses =
        COUNSELING_REVIEW_STATUSES;


      setSelected(
        target
      );


      setStatusDraft(
        allowedReviewStatuses.includes(
          target.status
        )
          ? target.status
          : "For review"
      );


      setRemarksDraft(
        target.counselorRemarks ||
        ""
      );

      resetPrivateCaseDrafts();

      initializePrivateCaseDrafts(
        target
      );

    },

    [
      requestedRequestId,
      requestedFromSchedule,
      requestedNavigationKey,
      enrichedRows
    ]
  );

  if (!hasAccess) {

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  function selectRequest(row) {

    reviewReturnPathRef.current =
      "";

    handledRequestNavigationRef.current =
      "";

    closingRequestReviewRef.current =
      false;

    setSelected(row);

    const allowedReviewStatuses =
      COUNSELING_REVIEW_STATUSES;


    setStatusDraft(
      allowedReviewStatuses.includes(
        row.status
      )
        ? row.status
        : "For review"
    );

    setRemarksDraft(
      row.counselorRemarks ||
      ""
    );

    resetPrivateCaseDrafts();

    initializePrivateCaseDrafts(
      row
    );
  }


  function transferRequestForConsultation(
    consultationId
  ) {

    return transferRequests.find(
      row =>
        row.consultationId ===
          consultationId &&
        row.status ===
          "Pending approval"
    );
  }


  function transferRequestForOwner(
    ownerId
  ) {

    return transferRequests.find(
      row =>
        row.ownerId ===
          ownerId &&
        row.status ===
          "Pending approval"
    );
  }


  function assignedCounselorIdForTransfer(
    row
  ) {

    const latestApprovedTransfer =
      transferRequests.find(
        transfer =>
          transfer.ownerId ===
            row?.ownerId &&
          transfer.status ===
            "Approved" &&
          transfer.acceptedById
      );


    return (
      latestApprovedTransfer
        ?.acceptedById ||
      caseProfileMap[
        row?.ownerId
      ]?.assignedCounselorId ||
      row?.assignedCounselorId ||
      ""
    );
  }


  function transferActionState(
    row
  ) {

    const assignedCounselorId =
      assignedCounselorIdForTransfer(
        row
      );


    if (
      user.role !==
        "counselor" ||
      assignedCounselorId !==
        user.id
    ) {

      return {
        visible:
          false,

        disabled:
          true,

        pending:
          false,

        deadlinePassed:
          false,

        reason:
          "Only the currently assigned counselor can transfer this user."
      };
    }


    const pendingTransfer =
      transferRequestForOwner(
        row.ownerId
      );


    if (pendingTransfer) {

      return {
        visible:
          true,

        disabled:
          true,

        pending:
          true,

        deadlinePassed:
          transferRequestHasStarted(
            pendingTransfer
          ),

        reason:
          "A counselor transfer for this user is already waiting for approval."
      };
    }


    if (
      appointmentHasStarted(
        row
      )
    ) {

      return {
        visible:
          true,

        disabled:
          true,

        pending:
          false,

        deadlinePassed:
          true,

        reason:
          "Transfers must be requested before the counseling start time."
      };
    }


    return {
      visible:
        true,

      disabled:
        false,

      pending:
        false,

      deadlinePassed:
        false,

      reason:
        "Transfer this user to another counselor. The assignment changes only after another counselor approves."
    };
  }


  function canRequestTransfer(
    row
  ) {

    const state =
      transferActionState(
        row
      );


    return (
      state.visible &&
      !state.disabled
    );
  }


  async function requestCounselorTransfer(
    row
  ) {

    if (!canRequestTransfer(row)) {

      alert(
        transferActionState(row).reason ||
        "This user cannot be transferred right now."
      );

      return;
    }


    const reason =
      window.prompt(
        "Briefly state why this user needs to be transferred to another counselor before the counseling starts."
      );


    if (reason === null) {
      return;
    }


    if (!reason.trim()) {

      alert(
        "Please enter a short reason for the counselor transfer."
      );

      return;
    }


    const scheduledStartAt =
      appointmentStartDate(
        row
      );


    if (
      scheduledStartAt &&
      Date.now() >=
        scheduledStartAt.getTime()
    ) {

      alert(
        "The counseling start time has already passed. This user can no longer be transferred for this counseling schedule."
      );

      return;
    }


    if (
      !window.confirm(
        [
          `Transfer ${row.ownerName || "this user"} to another counselor?`,
          "",
          "Your assignment remains active until another counselor approves.",
          `Counseling start: ${row.date || "No date"} · ${row.time || "No time"}`
        ].join("\n")
      )
    ) {
      return;
    }


    try {

      const counselingProfileRef =
        doc(
          db,
          "counselingProfiles",
          row.ownerId
        );


      const counselingProfileSnap =
        await getDoc(
          counselingProfileRef
        );


      if (counselingProfileSnap.exists()) {

        const existingProfile =
          counselingProfileSnap.data();


        if (
          existingProfile.assignedCounselorId &&
          existingProfile.assignedCounselorId !==
            user.id
        ) {

          throw new Error(
            `This user is currently assigned to ${existingProfile.assignedCounselorName || "another counselor"}. Only the assigned counselor can request a transfer.`
          );
        }


        if (
          !existingProfile.assignedCounselorId
        ) {

          await setDoc(
            counselingProfileRef,
            {
              assignedCounselorId:
                user.id,

              assignedCounselorName:
                user.name ||
                "Guidance Counselor",

              assignedCounselorDepartment:
                user.department ||
                "",

              updatedById:
                user.id,

              updatedByName:
                user.name ||
                "Guidance Counselor",

              updatedAt:
                serverTimestamp()
            },
            {
              merge:
                true
            }
          );
        }

      } else {

        await setDoc(
          counselingProfileRef,
          {
            ownerId:
              row.ownerId,

            ownerName:
              row.ownerName ||
              "",

            department:
              row.department ||
              "",

            assignedCounselorId:
              user.id,

            assignedCounselorName:
              user.name ||
              "Guidance Counselor",

            assignedCounselorDepartment:
              user.department ||
              "",

            caseHistory:
              "",

            counselingSessionSummary:
              "",

            counselorObservation:
              "",

            recommendations:
              "",

            updatedById:
              user.id,

            updatedByName:
              user.name ||
              "Guidance Counselor",

            updatedAt:
              serverTimestamp()
          }
        );
      }


      const transferRef =
        doc(
          collection(
            db,
            "transferRequests"
          )
        );


      await setDoc(
        transferRef,
        {
          ownerId:
            row.ownerId,

          ownerName:
            row.ownerName ||
            "",

          ownerDepartment:
            row.department ||
            "",

          consultationId:
            row.id,

          date:
            row.date ||
            "",

          time:
            row.time ||
            "",

          mode:
            row.mode ||
            "Face-to-face",

          requestStatus:
            row.status ||
            "Pending approval",

          scheduledStartAt:
            scheduledStartAt ||
            null,

          requestedById:
            user.id,

          requestedByName:
            user.name ||
            "Guidance Counselor",

          requestedByDepartment:
            user.department ||
            "",

          reason:
            reason.trim(),

          status:
            "Pending approval",

          acceptedById:
            "",

          acceptedByName:
            "",

          acceptedByDepartment:
            "",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );


      await updateRecord(
        "consultations",
        row.id,
        {
          assignedCounselorId:
            user.id,

          assignedCounselorName:
            user.name ||
            "Guidance Counselor",

          assignedCounselorDepartment:
            user.department ||
            "",

          transferStatus:
            "Pending approval",

          transferRequestId:
            transferRef.id
        }
      );


      const otherCounselors =
        counselors.filter(
          counselor =>
            counselor.id !==
            user.id
        );


      await Promise.allSettled(
        otherCounselors.map(
          counselor =>
            addRecord(
              "notifications",
              {
                ownerId:
                  counselor.id,

                title:
                  "User waiting for counselor transfer",

                message:
                  `${row.ownerName || "A user"} is waiting for counselor transfer approval from ${user.name || "the currently assigned counselor"}. Status: ${row.status || "Not recorded"}. Counseling start: ${row.date || "No date"} · ${row.time || "No time"}. Open your Dashboard to review the transfer before counseling starts.`,

                notificationType:
                  "transfer_request",

                senderRole:
                  "counselor",

                senderId:
                  user.id,

                senderName:
                  user.name ||
                  "Guidance Counselor",

                targetPath:
                  "/dashboard",

                sourceType:
                  "transfer",

                sourceId:
                  transferRef.id,

                consultationId:
                  row.id,

                read:
                  false
              }
            )
        )
      );


      await addRecord(
        "notifications",
        {
          ownerId:
            row.ownerId,

          title:
            "Counselor transfer requested",

          message:
            `${user.name || "Your assigned counselor"} requested a transfer to another Guidance Counselor. Your current counselor remains assigned until another counselor approves. Your counseling schedule stays unchanged while approval is pending.`,

          notificationType:
            "counselor_transfer_update",

          senderRole:
            "counselor",

          senderId:
            user.id,

          senderName:
            user.name ||
            "Guidance Counselor",

          targetPath:
            "/consultations",

          sourceType:
            "consultation",

          sourceId:
            row.id,

          transferRequestId:
            transferRef.id,

          read:
            false
        }
      );


      alert(
        "Transfer request sent. Every other counselor has been notified. You remain the assigned counselor until another counselor approves the transfer before the counseling start time."
      );

    } catch (error) {

      console.error(
        "Unable to request counselor transfer:",
        error
      );


      alert(
        error?.message ||
        "Unable to request the counselor transfer."
      );
    }
  }


  async function saveRequestUpdate() {

    if (!selected) {
      return;
    }


    if (
      requestIsReadOnly(
        selected
      )
    ) {

      alert(
        "This counseling request has already been transferred to another counselor. You may view the record, but only the currently assigned counselor can make changes."
      );

      return;
    }


    try {

      setSaving(true);


      const requestChanged =
        selected.status !==
          statusDraft ||
        String(
          selected.counselorRemarks ||
          ""
        ) !==
          String(
            remarksDraft ||
            ""
          );


      const privateCaseChanged =
        Boolean(
          canEditPrivateCaseFields &&
          (
            String(
              selectedCaseProfile
                ?.caseHistory ||
              selectedCaseProfile
                ?.notes ||
              ""
            ).trim() !==
              caseHistoryDraft.trim()
            ||
            String(
              selectedCaseProfile
                ?.counselingSessionSummary ||
              ""
            ).trim() !==
              sessionSummaryDraft.trim()
            ||
            String(
              selectedCaseProfile
                ?.counselorObservation ||
              ""
            ).trim() !==
              observationDraft.trim()
            ||
            String(
              selectedCaseProfile
                ?.recommendations ||
              ""
            ).trim() !==
              recommendationsDraft.trim()
          )
        );


      const requestUpdate = {

        status:
          statusDraft,

        counselorRemarks:
          remarksDraft

      };


      if (
        user.role ===
          "counselor" &&
        statusDraft ===
          "Schedule for counseling" &&
        !selected.assignedCounselorId
      ) {

        requestUpdate.assignedCounselorId =
          user.id;

        requestUpdate.assignedCounselorName =
          user.name ||
          "Guidance Counselor";

        requestUpdate.assignedCounselorDepartment =
          user.department ||
          "";
      }


      const effectiveCounselorId =
        selected.assignedCounselorId ||
        (
          user.role ===
            "counselor"
            ? user.id
            : ""
        );


      const legacyActiveRequestIdsForOwner =
        enrichedRows
          .filter(
            row =>
              row.ownerId ===
                selected.ownerId &&
              counselingRequestIsActive(
                row
              )
          )
          .map(
            row =>
              row.id
          );


      if (
        statusDraft ===
          "Schedule for counseling" &&
        !effectiveCounselorId
      ) {

        throw new Error(
          "A Guidance Counselor must be assigned before this request can be scheduled."
        );
      }


      const willAssignCurrentCounselor =
        Boolean(
          user.role ===
            "counselor" &&
          statusDraft ===
            "Schedule for counseling" &&
          !selected.assignedCounselorId
        );


      const caseProfileRef =
        selected.ownerId
          ? doc(
              db,
              "counselingProfiles",
              selected.ownerId
            )
          : null;


      const needsCaseProfileCreation =
        Boolean(
          caseProfileRef &&
          user.role ===
            "counselor" &&
          (
            willAssignCurrentCounselor ||
            (
              canEditPrivateCaseFields &&
              !selectedCaseProfile &&
              privateCaseChanged
            )
          )
        );


      if (
        needsCaseProfileCreation &&
        (
          !selectedAccount
            ?.name ||
          !selectedAccount
            ?.department
        )
      ) {

        throw new Error(
          "Please wait for the user's account information to finish loading, then save the review again."
        );
      }


      const requestRef =
        doc(
          db,
          "consultations",
          selected.id
        );


      const requestGuardRef =
        doc(
          db,
          "counselingRequestGuards",
          selected.ownerId
        );


      const slotRef =
        effectiveCounselorId &&
        selected.date &&
        selected.time
          ? doc(
              db,
              "counselingScheduleSlots",
              counselingSlotDocumentId(
                effectiveCounselorId,
                selected.date,
                selected.time
              )
            )
          : null;


      await runTransaction(
        db,

        async transaction => {

          const requestSnap =
            await transaction.get(
              requestRef
            );


          const requestGuardSnap =
            await transaction.get(
              requestGuardRef
            );


          if (!requestSnap.exists()) {

            throw new Error(
              "This counseling request no longer exists."
            );
          }


          const slotSnap =
            slotRef
              ? await transaction.get(
                  slotRef
                )
              : null;


          const slotState =
            statusDraft ===
              "Schedule for counseling"
              ? "booked"
              : (
                  statusDraft ===
                    "For review" &&
                  Boolean(
                    selected.assignedCounselorId
                  )
                )
                ? "held"
                : "";


          const existingGuardIds =
            requestGuardSnap.exists() &&
            Array.isArray(
              requestGuardSnap.data()
                ?.activeRequestIds
            )
              ? requestGuardSnap.data()
                  .activeRequestIds
                  .filter(Boolean)
              : legacyActiveRequestIdsForOwner;


          const uniqueGuardIds =
            Array.from(
              new Set(
                existingGuardIds
              )
            );


          const nextRequestIsReleased =
            counselingRequestAllowsAnother(
              statusDraft
            );


          const selectedWasReleased =
            counselingRequestAllowsAnother(
              selected.status
            );


          let nextGuardIds =
            uniqueGuardIds.filter(
              requestId =>
                requestId !==
                selected.id
            );


          if (!nextRequestIsReleased) {

            if (
              selectedWasReleased &&
              nextGuardIds.length >
                0
            ) {

              throw new Error(
                "This user already has another active counseling request. Conclude or mark that request for follow up before reopening this case."
              );
            }


            nextGuardIds = [
              ...nextGuardIds,
              selected.id
            ];
          }


          if (
            slotState &&
            slotSnap
              ?.exists() &&
            activeCounselingSlotState(
              slotSnap.data()
                ?.state
            ) &&
            slotSnap.data()
              ?.consultationId !==
              selected.id
          ) {

            throw new Error(
              "This counselor already has another user assigned to that date and time. Please choose another schedule before approving this request."
            );
          }


          transaction.update(
            requestRef,
            {
              ...requestUpdate,

              updatedAt:
                serverTimestamp()
            }
          );


          transaction.set(
            requestGuardRef,
            {
              ownerId:
                selected.ownerId,

              activeRequestIds:
                nextGuardIds,

              activeRequestCount:
                nextGuardIds.length,

              latestRequestId:
                selected.id,

              latestStatus:
                statusDraft,

              updatedById:
                user.id,

              updatedAt:
                serverTimestamp()
            },
            {
              merge:
                true
            }
          );


          if (
            caseProfileRef &&
            willAssignCurrentCounselor
          ) {

            transaction.set(
              caseProfileRef,
              {
                ownerId:
                  selected.ownerId,

                ownerName:
                  selectedAccount
                    ?.name ||
                  selected.ownerName ||
                  "",

                department:
                  selectedAccount
                    ?.department ||
                  selected.department ||
                  "",

                assignedCounselorId:
                  user.id,

                assignedCounselorName:
                  user.name ||
                  "Guidance Counselor",

                assignedCounselorDepartment:
                  user.department ||
                  "",

                updatedById:
                  user.id,

                updatedByName:
                  user.name ||
                  "Guidance Counselor",

                updatedAt:
                  serverTimestamp()
              },
              {
                merge:
                  true
              }
            );
          }


          if (
            caseProfileRef &&
            canEditPrivateCaseFields &&
            privateCaseChanged
          ) {

            const privateCaseUpdate = {

              caseHistory:
                caseHistoryDraft.trim(),

              counselingSessionSummary:
                sessionSummaryDraft.trim(),

              counselorObservation:
                observationDraft.trim(),

              recommendations:
                recommendationsDraft.trim(),

              updatedById:
                user.id,

              updatedByName:
                user.name ||
                user.email ||
                "Authorized user",

              updatedAt:
                serverTimestamp()

            };


            if (
              user.role ===
                "counselor" &&
              !selectedCaseProfile
            ) {

              transaction.set(
                caseProfileRef,
                {
                  ownerId:
                    selected.ownerId,

                  ownerName:
                    selectedAccount
                      ?.name ||
                    selected.ownerName ||
                    "",

                  department:
                    selectedAccount
                      ?.department ||
                    selected.department ||
                    "",

                  assignedCounselorId:
                    selectedAssignedCounselorId ||
                    user.id,

                  assignedCounselorName:
                    selected
                      .assignedCounselorName ||
                    user.name ||
                    "Guidance Counselor",

                  assignedCounselorDepartment:
                    selectedAssignedCounselorDepartment ||
                    user.department ||
                    "",

                  ...privateCaseUpdate
                },
                {
                  merge:
                    true
                }
              );

            } else {

              transaction.set(
                caseProfileRef,
                privateCaseUpdate,
                {
                  merge:
                    true
                }
              );
            }
          }


          if (
            slotRef &&
            slotState
          ) {

            transaction.set(
              slotRef,
              {
                counselorId:
                  effectiveCounselorId,

                date:
                  selected.date,

                time:
                  selected.time,

                consultationId:
                  selected.id,

                assignmentSourceConsultationId:
                  selected.id,

                state:
                  slotState,

                ...(
                  slotSnap
                    ?.exists()
                    ? {}
                    : {
                        createdAt:
                          serverTimestamp()
                      }
                ),

                updatedAt:
                  serverTimestamp()
              },
              {
                merge:
                  true
              }
            );

          } else if (
            slotRef &&
            slotSnap
              ?.exists() &&
            slotSnap.data()
              ?.consultationId ===
              selected.id
          ) {

            transaction.delete(
              slotRef
            );
          }
        }
      );


      let notificationSent =
        true;


      if (
        requestChanged &&
        selected.ownerId &&
        user.role === "counselor"
      ) {

        try {

          await addRecord(
            "notifications",
            {

              ownerId:
                selected.ownerId,

              title:
                "Counseling request updated by counselor",

              message:
                `Your counselor updated your counseling request. Status: ${statusDraft}.${COUNSELING_REQUEST_RELEASE_STATUSES.includes(statusDraft) ? " You may now submit another counseling request if needed." : ""}${remarksDraft.trim() ? " A counselor remark is available." : ""}`,

              notificationType:
                "counselor_update",

              senderRole:
                "counselor",

              senderId:
                user.id,

              senderName:
                user.name || "Guidance Counselor",

              targetPath:
                "/consultations",

              sourceType:
                "consultation",

              sourceId:
                selected.id,

              read:
                false

            }
          );

        } catch (
          notificationError
        ) {

          notificationSent =
            false;


          console.error(
            "Unable to send counseling update notification:",
            notificationError
          );
        }
      }


      setSelected({
        ...selected,
        ...requestUpdate,

        status:
          statusDraft,

        counselorRemarks:
          remarksDraft
      });


      alert(
        notificationSent
          ? "Counseling request updated successfully."
          : "The counseling request was updated, but the user notification could not be sent."
      );

    } catch (err) {

      console.error(
        "Counseling request update error:",
        err
      );


      alert(
        err?.message ||
        "Unable to update the counseling request."
      );

    } finally {

      setSaving(false);

    }
  }


  return (

    <>

      <PageTitle

        title="Counseling Requests"

        subtitle={
          isSuperAdmin
            ? "Review counseling requests from all departments."
            : `Review counseling requests for ${user.department}.`
        }

      />


      <section className="panel counselor-filter-panel">

        <div className="counselor-filter-heading">

          <div>

            <h2>
              Filter Counseling Requests
            </h2>

            <p>
              {
                isSuperAdmin
                  ? "Filter requests by college, program, and the user's latest assessment priority."
                  : "Filter requests by program and the user's latest assessment priority."
              }
            </p>

          </div>


          <span className="counselor-filter-count">
            {
              filteredRequestRows.length
            }
            {" "}
            of
            {" "}
            {
              enrichedRows.length
            }
          </span>

        </div>


        <div
          className={
            isSuperAdmin
              ? "counselor-filter-grid three-columns"
              : "counselor-filter-grid"
          }
        >

          {isSuperAdmin && (

            <label>

              College / Office

              <select
                value={collegeFilter}
                onChange={
                  event => {

                    setCollegeFilter(
                      event.target.value
                    );

                    setProgramFilter(
                      "all"
                    );
                  }
                }
              >

                <option value="all">
                  All colleges / offices
                </option>

                {requestCollegeOptions.map(
                  college => (

                    <option
                      key={college}
                      value={college}
                    >
                      {college}
                    </option>

                  )
                )}

              </select>

            </label>

          )}


          <label>

            Program

            <select
              value={programFilter}
              onChange={
                event =>
                  setProgramFilter(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All programs
              </option>

              {requestProgramOptions.map(
                program => (

                  <option
                    key={program}
                    value={program}
                  >
                    {program}
                  </option>

                )
              )}

            </select>

          </label>


          <label>

            Priority

            <select
              value={priorityFilter}
              onChange={
                event =>
                  setPriorityFilter(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All priorities
              </option>

              <option value="Low">
                Low
              </option>

              <option value="Moderate">
                Moderate
              </option>

              <option value="High">
                High
              </option>

              <option value="Critical">
                Critical
              </option>

              <option value="No Assessment">
                No assessment
              </option>

            </select>

          </label>

        </div>

      </section>


      <section className="panel counseling-request-list-panel">

        <h2>
          Request List
        </h2>


        {filteredRequestRows.length === 0

          ? (

            <Empty
              text="No counseling requests."
            />

          )

          : filteredRequestRows.map(
              row => (

                <article

                  className="record-card counseling-request-list-card"

                  key={
                    row.id
                  }

                >

                  <div className="counseling-request-list-card-header">

                    <strong>
                      {
                        row.ownerName ||
                        "User"
                      }
                    </strong>


                    <div className="counseling-request-status-group">

                      <span className="status">
                        {
                          row.status ||
                          "Pending approval"
                        }
                      </span>


                      {transferRequestForOwner(
                        row.ownerId
                      ) && (

                        <span className="transfer-pending-label">
                          Transfer awaiting approval
                        </span>

                      )}

                    </div>

                  </div>


                  <p>

                    {
                      row.category ||
                      "Counseling concern"
                    }

                    {" · "}

                    {
                      row.date ||
                      "No date"
                    }

                    {" · "}

                    {
                      row.time ||
                      "No time"
                    }

                  </p>


                  <small>
                    {
                      row.department ||
                      "No department"
                    }

                    {" · "}

                    {
                      counselorProgramLabel(
                        row.program
                      )
                    }

                    {row.mode && (
                      <>
                        {" · "}
                        {row.mode}
                      </>
                    )}
                  </small>


                  <div className="counseling-request-priority-row">

                    <span
                      className={
                        priorityClassName(
                          row.priority
                        )
                      }
                    >
                      {
                        row.priority ||
                        "No Assessment"
                      }
                    </span>

                  </div>


                  <div className="counseling-request-list-actions">

                    <button

                      type="button"

                      className="secondary-button"

                      onClick={
                        () =>
                          selectRequest(
                            row
                          )
                      }

                    >
                      {
                        requestIsReadOnly(
                          row
                        )
                          ? "View record"
                          : "Review request"
                      }
                    </button>


                    {transferActionState(row).visible && (

                      <button
                        type="button"
                        className="transfer-user-button"
                        disabled={
                          transferActionState(
                            row
                          ).disabled
                        }
                        title={
                          transferActionState(
                            row
                          ).reason
                        }
                        onClick={
                          () =>
                            requestCounselorTransfer(
                              row
                            )
                        }
                      >
                        Transfer user to another counselor
                      </button>

                    )}


                    {
                      transferActionState(
                        row
                      ).visible &&
                      transferActionState(
                        row
                      ).deadlinePassed &&
                      !transferActionState(
                        row
                      ).pending && (

                        <span className="transfer-deadline-label">
                          Transfer closed: counseling already started
                        </span>

                      )
                    }

                  </div>

                </article>

              )
            )
        }

      </section>


      {selected && (

        <div

          className="review-request-modal-backdrop"

          role="presentation"

          onMouseDown={
            event => {

              if (
                event.target ===
                event.currentTarget
              ) {

                closeRequestReview();
              }
            }
          }

        >

          <section

            className="review-request-modal"

            role="dialog"

            aria-modal="true"

            aria-label={
              `Review counseling request for ${
                selected.ownerName ||
                "user"
              }`
            }

          >

            <header className="review-request-modal-header">

              <div>

                <p className="review-request-modal-eyebrow">
                  Counseling Request
                </p>

                <div className="review-request-modal-title-row">

                  <h2>
                    {
                      selected.ownerName ||
                      "User"
                    }
                  </h2>

                  <span className="status">
                    {
                      selected.status ||
                      "Pending approval"
                    }
                  </span>


                  {transferRequestForOwner(
                    selected.ownerId
                  ) && (

                    <span className="transfer-pending-label">
                      Transfer awaiting approval
                    </span>

                  )}

                </div>

                <p className="review-request-modal-subtitle">
                  Review the user's account information first,
                  then the counseling request and counselor review.
                </p>

              </div>


              <button

                type="button"

                className="review-request-close-button"

                onClick={
                  closeRequestReview
                }

                aria-label="Close counseling request review"

                title="Close"

              >
                ×
              </button>

            </header>


            <div className="review-request-modal-body">

              <section className="review-request-modal-card review-request-account-card">

                <div className="review-request-account-heading">

                  <div>

                    <h3>
                      Account Information
                    </h3>

                    <p>
                      Verify the user's account information before reviewing the counseling request.
                    </p>

                  </div>

                </div>


                {selectedAccountLoading

                  ? (

                    <div className="user-profile-empty">
                      Loading account information...
                    </div>

                  )

                  : (

                    <>

                      {selectedAccountError && (

                        <div className="error-box">
                          {selectedAccountError}
                        </div>

                      )}


                      <div className="review-request-detail-grid review-request-account-grid">

                        <div className="review-request-detail-item">

                          <span>
                            Program
                          </span>

                          <strong>
                            {
                              selectedAccount
                                ?.program ||
                              selected.program ||
                              (
                                selectedAccount
                                  ?.role ===
                                  "student"
                                  ? "Not provided"
                                  : "Not applicable"
                              )
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            {
                              selectedAccount
                                ?.role ===
                                "student"
                                ? "Student Number"
                                : (
                                    employeeUserRole(
                                      selectedAccount
                                        ?.role
                                    )
                                      ? "Employee Number"
                                      : "Student / Employee Number"
                                  )
                            }
                          </span>

                          <strong>
                            {
                              selectedAccount
                                ?.userNumber ||
                              "Not provided"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            Gender
                          </span>

                          <strong>
                            {
                              normalizedGender(
                                selectedAccount
                                  ?.gender
                              )
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            Contact Number
                          </span>

                          <strong>
                            {
                              selectedAccount
                                ?.phoneNumber ||
                              "Not provided"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            Contact Person
                          </span>

                          <strong>
                            {
                              selectedAccount
                                ?.contactPersonName ||
                              "Not provided"
                            }
                          </strong>

                        </div>


                        <div className="review-request-detail-item">

                          <span>
                            Contact Person Number
                          </span>

                          <strong>
                            {
                              selectedAccount
                                ?.contactPersonPhone ||
                              "Not provided"
                            }
                          </strong>

                        </div>

                      </div>

                    </>

                  )
                }

              </section>


              <section className="review-request-modal-card">

                <h3>
                  Counseling Request Details
                </h3>


                <div className="review-request-detail-grid">

                  <div className="review-request-detail-item">

                    <span>
                      Concern
                    </span>

                    <strong>
                      {
                        selected.category ||
                        "Not provided"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item">

                    <span>
                      College / Office
                    </span>

                    <strong>
                      {
                        selected.department ||
                        "Not provided"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item">

                    <span>
                      Priority
                    </span>

                    <strong>
                      {
                        selected.priority ||
                        "No Assessment"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item">

                    <span>
                      Mode
                    </span>

                    <strong>
                      {
                        selected.mode ||
                        "Not provided"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item">

                    <span>
                      Preferred Schedule
                    </span>

                    <strong>
                      {
                        selected.date ||
                        "No date"
                      }

                      {" · "}

                      {
                        selected.time ||
                        "No time"
                      }
                    </strong>

                  </div>


                  <div className="review-request-detail-item full">

                    <span>
                      Details
                    </span>

                    <strong className="review-request-details-text">
                      {
                        selected.message ||
                        "No additional details."
                      }
                    </strong>

                  </div>

                </div>

              </section>


              <section className="review-request-modal-card review-request-update-card">

                <h3>
                  Counselor Review
                </h3>


                {requestIsReadOnly(
                  selected
                ) && (

                  <div className="notice">
                    Read-only record: this counseling request was transferred to another counselor. You can review the existing information, but you cannot change the status or counselor remarks.
                  </div>

                )}


                <label>

                  Status

                  <select

                    value={
                      statusDraft
                    }

                    disabled={
                      requestIsReadOnly(
                        selected
                      )
                    }

                    onChange={
                      e =>
                        setStatusDraft(
                          e.target.value
                        )
                    }

                  >

                    <option>
                      For review
                    </option>

                    <option>
                      Schedule for counseling
                    </option>

                    <option>
                      Follow up is recommended
                    </option>

                    <option>
                      Counseling is optional
                    </option>

                    <option>
                      For referral
                    </option>

                    <option>
                      Concluded
                    </option>

                  </select>

                </label>


                <label>

                  Counselor remarks

                  <small className="review-field-visibility-note">
                    Visible to the user in Counseling Requests and History.
                  </small>

                  <textarea

                    rows="9"

                    value={
                      remarksDraft
                    }

                    readOnly={
                      requestIsReadOnly(
                        selected
                      )
                    }

                    onChange={
                      e =>
                        setRemarksDraft(
                          e.target.value
                        )
                    }

                    placeholder="Add remarks or instructions for the user."

                  />

                </label>


                {canViewPrivateCaseFields

                  ? (

                    <div className="review-private-case-section">

                      <div className="review-private-case-heading">

                        <h4>
                          Private Case Information
                        </h4>

                        <p>
                          Only the assigned counselor and Super Admin can view these fields. They are never shown to Student, Teaching, or Non-teaching users.
                        </p>

                      </div>


                      {!canEditPrivateCaseFields && (

                        <div className="notice">
                          This private case record is read-only here. A counselor must be assigned before a new private case profile can be created.
                        </div>

                      )}


                      <div className="counselor-notes-grid">

                        <label className="counselor-note-field">

                          <span>
                            Case History
                          </span>

                          <textarea
                            rows="5"
                            value={caseHistoryDraft}
                            readOnly={
                              !canEditPrivateCaseFields ||
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event =>
                                setCaseHistoryDraft(
                                  event.target.value
                                )
                            }
                            placeholder="Record relevant case background, previous concerns, and important case developments."
                          />

                        </label>


                        <label className="counselor-note-field">

                          <span>
                            Summary of Counseling Sessions
                          </span>

                          <textarea
                            rows="5"
                            value={sessionSummaryDraft}
                            readOnly={
                              !canEditPrivateCaseFields ||
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event =>
                                setSessionSummaryDraft(
                                  event.target.value
                                )
                            }
                            placeholder="Summarize the important topics, concerns, and outcomes discussed during counseling."
                          />

                        </label>


                        <label className="counselor-note-field">

                          <span>
                            Counselor's Observations
                          </span>

                          <textarea
                            rows="5"
                            value={observationDraft}
                            readOnly={
                              !canEditPrivateCaseFields ||
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event =>
                                setObservationDraft(
                                  event.target.value
                                )
                            }
                            placeholder="Record relevant professional observations from the counseling interaction."
                          />

                        </label>


                        <label className="counselor-note-field">

                          <span>
                            Recommendations
                          </span>

                          <textarea
                            rows="5"
                            value={recommendationsDraft}
                            readOnly={
                              !canEditPrivateCaseFields ||
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event =>
                                setRecommendationsDraft(
                                  event.target.value
                                )
                            }
                            placeholder="Record follow-up steps, support recommendations, or other counselor guidance."
                          />

                        </label>

                      </div>

                    </div>

                  )

                  : user.role ===
                      "counselor" && (

                    <div className="review-private-case-restricted">
                      Private case information is available only to the counselor currently assigned to this user and to Super Admin.
                    </div>

                  )
                }


                <div className="counseling-review-action-area">

                  {
                    transferActionState(
                      selected
                    ).visible &&
                    transferActionState(
                      selected
                    ).deadlinePassed &&
                    !transferActionState(
                      selected
                    ).pending && (

                      <div className="counseling-review-action-note">

                        <span className="transfer-deadline-label">
                          Transfer closed: counseling already started
                        </span>

                      </div>

                    )
                  }


                  <div className="review-request-modal-actions counseling-review-actions">

                    <button

                      type="button"

                      className="secondary-button"

                      onClick={
                        closeRequestReview
                      }

                    >
                      Close
                    </button>


                    {transferActionState(
                      selected
                    ).visible && (

                      <button

                        type="button"

                        className="transfer-user-button"

                        disabled={
                          transferActionState(
                            selected
                          ).disabled
                        }

                        title={
                          transferActionState(
                            selected
                          ).reason
                        }

                        onClick={
                          () =>
                            requestCounselorTransfer(
                              selected
                            )
                        }

                      >
                        Transfer user to another counselor
                      </button>

                    )}


                    <button

                      type="button"

                      className="primary-button"

                      disabled={
                        saving ||
                        requestIsReadOnly(
                          selected
                        )
                      }

                      onClick={
                        saveRequestUpdate
                      }

                    >

                      {
                        requestIsReadOnly(
                          selected
                        )
                          ? "Read only"
                          : saving
                            ? "Saving..."
                            : "Save counselor review"
                      }

                    </button>

                  </div>

                </div>

              </section>

            </div>

          </section>

        </div>

      )}

    </>

  );
}
// ======================================================
// COUNSELOR SCHEDULE
// ======================================================

function Schedule() {

  const { user } =
    useAuth();


  const navigate =
    useNavigate();


  const isSuperAdmin =
    user.role ===
    "super_admin";


  const departmentRows =
    useRows(
      "consultations",
      isSuperAdmin
        ? {}
        : {
            department:
              user.department
          }
    );


  const transferredAssignedRows =
    useRows(
      "consultations",
      isSuperAdmin
        ? {
            ownerId:
              "__NO_ACCESS__"
          }
        : {
            assignedCounselorId:
              user.id
          }
    );


  const activeDepartmentRows =
    isSuperAdmin
      ? departmentRows
      : departmentRows.filter(
          row =>
            !row.assignedCounselorId ||
            row.assignedCounselorId ===
              user.id
        );


  const rows =
    isSuperAdmin
      ? departmentRows
      : mergeRowsById(
          activeDepartmentRows,
          transferredAssignedRows
        );


  const appointments =
    [...rows]
      .filter(
        row =>
          row.date &&
          row.time
      )
      .sort(
        (a, b) => {

          const dateDifference =
            counselingAppointmentSortValue(
              a
            ) -
            counselingAppointmentSortValue(
              b
            );


          if (dateDifference !== 0) {

            return dateDifference;
          }


          return String(
            a.ownerName || ""
          ).localeCompare(
            String(
              b.ownerName || ""
            )
          );
        }
      );


  function openAppointment(
    appointment
  ) {

    navigate(
      "/counseling-requests",
      {
        state: {
          requestId:
            appointment.id,

          fromSchedule:
            true,

          requestNavigationKey:
            `${appointment.id}-schedule`
        }
      }
    );
  }


  return (

    <>

      <PageTitle

        title="Counselor Schedule"

        subtitle="Appointments are arranged from earliest to latest. Click an appointment to open its counseling request."

      />


      <section className="panel">

        <div className="schedule-grid">


          {appointments.length === 0

            ? (

              <Empty
                text="No appointments yet."
              />

            )

            : appointments.map(
                row => (

                  <button

                    type="button"

                    className="schedule-card schedule-card-button"

                    key={
                      row.id
                    }

                    onClick={
                      () =>
                        openAppointment(
                          row
                        )
                    }

                    title="Open counseling request"

                  >

                    <Calendar />


                    <div>

                      <strong>

                        {
                          row.date
                        }

                        {" — "}

                        {
                          row.time
                        }

                      </strong>


                      <p>

                        {
                          row.ownerName ||
                          "User"
                        }

                        {row.program && (
                          <>
                            {" · "}
                            {row.program}
                          </>
                        )}

                        {row.mode && (
                          <>
                            {" · "}
                            {row.mode}
                          </>
                        )}

                      </p>


                      <div className="schedule-card-footer">

                        <span className="status">

                          {
                            row.status ||
                            "For review"
                          }

                        </span>


                        <span className="schedule-open-hint">
                          Open request
                        </span>

                      </div>

                    </div>

                  </button>

                )
              )
          }

        </div>

      </section>

    </>

  );
}


// ======================================================
// ACCOUNT MANAGEMENT
// ======================================================

function Accounts() {

  const users =
    useRows(
      "users"
    );


  return (

    <>

      <PageTitle

        title="Account Management"

        subtitle="Super Admin overview of students, teaching, non-teaching, counselors, and administrators."

      />


      <section className="panel">


        <div className="table-wrap">

          <table>

            <thead>

              <tr>

                <th>
                  Name
                </th>

                <th>
                  Email
                </th>

                <th>
                  Role
                </th>

                <th>
                  Department
                </th>

              </tr>

            </thead>


            <tbody>

              {users.map(
                account => (

                  <tr
                    key={
                      account.id
                    }
                  >

                    <td>
                      {
                        account.name
                      }
                    </td>

                    <td>
                      {
                        account.email
                      }
                    </td>

                    <td>
                      {
                        generalUserRoleLabel(
                          account.role
                        )
                      }
                    </td>

                    <td>
                      {
                        account.department
                      }
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>


        <div className="notice">

          Counselor and Super Admin accounts should be created through Firebase Authentication and a secured administrative process, not through public registration.

        </div>

      </section>

    </>

  );
}



// ======================================================
// FEEDBACK ANALYTICS - SUPER ADMIN
// ======================================================

function FeedbackAnalytics() {

  const [feedbackRows, setFeedbackRows] =
    useState([]);

  const [loadingFeedback, setLoadingFeedback] =
    useState(true);

  const [feedbackError, setFeedbackError] =
    useState("");


  useEffect(
    () => {

      const unsubscribe =
        onSnapshot(
          collection(
            db,
            "feedback"
          ),

          snapshot => {

            const rows =
              snapshot.docs.map(
                item => ({
                  id: item.id,
                  ...item.data()
                })
              );


            rows.sort(
              (a, b) =>
                feedbackTimestamp(b.createdAt) -
                feedbackTimestamp(a.createdAt)
            );


            setFeedbackRows(rows);
            setLoadingFeedback(false);
            setFeedbackError("");

          },

          err => {

            console.error(
              "Unable to load feedback analytics:",
              err
            );


            setFeedbackRows([]);
            setLoadingFeedback(false);

            setFeedbackError(
              err?.code ===
              "permission-denied"

                ? "Firestore denied access to system feedback. Check the feedback security rules."

                : (
                    err.message ||
                    "Unable to load feedback."
                  )
            );

          }
        );


      return unsubscribe;

    },
    []
  );


  const total =
    feedbackRows.length;


  const average =
    total
      ? (
          feedbackRows.reduce(
            (sum, item) =>
              sum +
              Number(
                item.rating || 0
              ),
            0
          ) /
          total
        ).toFixed(2)

      : "0.00";


  const distribution =
    [5, 4, 3, 2, 1].map(
      stars => ({
        stars,
        count:
          feedbackRows.filter(
            item =>
              Number(
                item.rating
              ) === stars
          ).length
      })
    );


  const categoryCounts =
    Array.from(
      new Set(
        feedbackRows.map(
          item =>
            item.category ||
            "Overall Experience"
        )
      )
    )
      .map(
        category => ({
          category,
          count:
            feedbackRows.filter(
              item =>
                (
                  item.category ||
                  "Overall Experience"
                ) === category
            ).length
        })
      )
      .sort(
        (a, b) =>
          b.count - a.count
      );


  return (

    <section className="panel feedback-analytics-panel">

      <div className="feedback-section-heading">

        <div>

          <h2>
            System Ratings & Feedback
          </h2>

          <p>
            Summary of feedback submitted by Student, Teaching, and Non-teaching users.
          </p>

        </div>

      </div>


      {loadingFeedback

        ? (

          <Empty
            text="Loading ratings and feedback..."
          />

        )

        : feedbackError

          ? (

            <div className="error-box">
              {feedbackError}
            </div>

          )

          : (

            <>

              <div className="feedback-summary-grid">

                <div className="feedback-summary-card">

                  <Star
                    size={28}
                    fill="currentColor"
                  />

                  <span>
                    Average Rating
                  </span>

                  <strong>
                    {average} / 5
                  </strong>

                </div>


                <div className="feedback-summary-card">

                  <ClipboardList
                    size={28}
                  />

                  <span>
                    Total Feedback
                  </span>

                  <strong>
                    {total}
                  </strong>

                </div>

              </div>


              <div className="feedback-report-grid">

                <div className="feedback-report-block">

                  <h3>
                    Rating Distribution
                  </h3>


                  {distribution.map(
                    item => (

                      <div
                        className="feedback-distribution-row"
                        key={item.stars}
                      >

                        <span>
                          {
                            "★".repeat(
                              item.stars
                            )
                          }
                        </span>


                        <div className="feedback-distribution-bar">

                          <i
                            style={{
                              width:
                                `${
                                  total
                                    ? (
                                        item.count /
                                        total
                                      ) * 100
                                    : 0
                                }%`
                            }}
                          />

                        </div>


                        <b>
                          {item.count}
                        </b>

                      </div>

                    )
                  )}

                </div>


                <div className="feedback-report-block">

                  <h3>
                    Feedback Categories
                  </h3>


                  {categoryCounts.length === 0

                    ? (
                      <p className="feedback-help-text">
                        No category data yet.
                      </p>
                    )

                    : categoryCounts.map(
                        item => (

                          <div
                            className="feedback-category-row"
                            key={item.category}
                          >

                            <span>
                              {item.category}
                            </span>

                            <strong>
                              {item.count}
                            </strong>

                          </div>

                        )
                      )
                  }

                </div>

              </div>


              <div className="feedback-recent-section">

                <h3>
                  Recent User Feedback
                </h3>


                {feedbackRows.length === 0

                  ? (

                    <Empty
                      text="No ratings or feedback have been submitted yet."
                    />

                  )

                  : (

                    <div className="table-wrap">

                      <table>

                        <thead>

                          <tr>

                            <th>
                              User
                            </th>

                            <th>
                              Role
                            </th>

                            <th>
                              Department
                            </th>

                            <th>
                              Rating
                            </th>

                            <th>
                              Category
                            </th>

                            <th>
                              Feedback
                            </th>

                            <th>
                              Date
                            </th>

                          </tr>

                        </thead>


                        <tbody>

                          {feedbackRows
                            .slice(
                              0,
                              20
                            )
                            .map(
                              item => (

                                <tr
                                  key={item.id}
                                >

                                  <td>
                                    {
                                      item.ownerName ||
                                      "User"
                                    }
                                  </td>

                                  <td className="capitalize-text">
                                    {
                                      generalUserRoleLabel(
                                        item.role
                                      )
                                    }
                                  </td>

                                  <td>
                                    {
                                      item.department ||
                                      "—"
                                    }
                                  </td>

                                  <td>
                                    <span className="table-star-rating">
                                      {
                                        "★".repeat(
                                          Number(
                                            item.rating || 0
                                          )
                                        )
                                      }
                                    </span>
                                    {" "}
                                    {
                                      item.rating
                                    }/5
                                  </td>

                                  <td>
                                    {
                                      item.category ||
                                      "Overall Experience"
                                    }
                                  </td>

                                  <td className="feedback-comment-cell">
                                    {
                                      item.feedback?.trim()
                                        ? item.feedback
                                        : "No written comment."
                                    }
                                  </td>

                                  <td>
                                    {
                                      formatFeedbackDate(
                                        item.createdAt
                                      )
                                    }
                                  </td>

                                </tr>

                              )
                            )
                          }

                        </tbody>

                      </table>

                    </div>

                  )
                }

              </div>

            </>

          )
      }

    </section>

  );
}


// ======================================================
// REPORTS
// ======================================================

function AnalyticsBar({
  label,
  value,
  maxValue,
  tone = "default"
}) {

  const safeValue =
    Number(
      value || 0
    );


  const width =
    maxValue > 0
      ? (
          safeValue /
          maxValue
        ) * 100
      : 0;


  const visibleWidth =
    safeValue > 0
      ? Math.max(
          width,
          2
        )
      : 0;


  return (

    <div className="analytics-bar-row">

      <div className="analytics-bar-label">
        {label}
      </div>


      <div
        className="analytics-bar-track"
        aria-hidden="true"
      >

        <div
          className={
            `analytics-bar-fill analytics-tone-${tone}`
          }
          style={{
            width:
              `${visibleWidth}%`
          }}
        />

      </div>


      <strong className="analytics-bar-value">
        {safeValue}
      </strong>

    </div>

  );
}


function AnalyticsLegend() {

  const items = [
    {
      label: "Low",
      tone: "low"
    },
    {
      label: "Moderate",
      tone: "moderate"
    },
    {
      label: "High",
      tone: "high"
    },
    {
      label: "Critical",
      tone: "critical"
    },
    {
      label: "Assessment cases",
      tone: "assessment"
    },
    {
      label: "Counseling requests",
      tone: "requests"
    },
    {
      label: "Scheduled sessions",
      tone: "sessions"
    }
  ];


  return (

    <div className="analytics-chart-legend">

      {items.map(
        item => (

          <div
            key={item.label}
            className="analytics-legend-item"
          >

            <span
              className={
                `analytics-legend-swatch analytics-tone-${item.tone}`
              }
            />

            <span>
              {item.label}
            </span>

          </div>

        )
      )}

    </div>

  );
}


function AnalyticsSummaryBarChart({
  title,
  description,
  rows
}) {

  const maxValue =
    Math.max(
      1,
      ...rows.map(
        row =>
          Number(
            row.value || 0
          )
      )
    );


  return (

    <section className="panel analytics-chart-panel">

      <div className="analytics-breakdown-heading">

        <div>

          <h2>
            {title}
          </h2>

          <p>
            {description}
          </p>

        </div>

      </div>


      <div className="analytics-summary-bars">

        {rows.map(
          row => (

            <AnalyticsBar
              key={row.label}
              label={row.label}
              value={row.value}
              maxValue={maxValue}
              tone={row.tone}
            />

          )
        )}

      </div>

    </section>

  );
}


function OperationalAnalyticsBarChart({
  title,
  description,
  rows
}) {

  const maxValue =
    Math.max(
      1,
      ...rows.flatMap(
        row => [
          ...ANALYTICS_PRIORITIES.map(
            priority =>
              Number(
                row[
                  priority
                ] || 0
              )
          ),
          Number(
            row.assessmentCases || 0
          ),
          Number(
            row.counselingRequests || 0
          ),
          Number(
            row.counselingSessions || 0
          )
        ]
      )
    );


  return (

    <section className="panel analytics-breakdown-panel analytics-chart-panel">

      <div className="analytics-breakdown-heading">

        <div>

          <h2>
            {title}
          </h2>

          <p>
            {description}
          </p>

        </div>

      </div>


      <AnalyticsLegend />


      {rows.length === 0

        ? (

          <div className="empty">
            No records are available for this breakdown.
          </div>

        )

        : (

          <div className="analytics-groups-list">

            {rows.map(
              row => (

                <article
                  key={row.label}
                  className="analytics-group-chart"
                >

                  <div className="analytics-group-chart-head">

                    <h3>
                      {row.label}
                    </h3>

                    <span>
                      {
                        row.assessmentCases
                      }
                      {" "}
                      assessment case
                      {
                        row.assessmentCases === 1
                          ? ""
                          : "s"
                      }
                    </span>

                  </div>


                  <div className="analytics-chart-block">

                    <h4>
                      Assessment priority
                    </h4>

                    {ANALYTICS_PRIORITIES.map(
                      priority => (

                        <AnalyticsBar
                          key={
                            `${row.label}-${priority}`
                          }
                          label={priority}
                          value={
                            row[
                              priority
                            ]
                          }
                          maxValue={maxValue}
                          tone={
                            priority.toLowerCase()
                          }
                        />

                      )
                    )}

                  </div>


                  <div className="analytics-chart-block">

                    <h4>
                      Assessment and counseling activity
                    </h4>

                    <AnalyticsBar
                      label="Assessment cases"
                      value={
                        row.assessmentCases
                      }
                      maxValue={maxValue}
                      tone="assessment"
                    />

                    <AnalyticsBar
                      label="Counseling requests"
                      value={
                        row.counselingRequests
                      }
                      maxValue={maxValue}
                      tone="requests"
                    />

                    <AnalyticsBar
                      label="Scheduled sessions"
                      value={
                        row.counselingSessions
                      }
                      maxValue={maxValue}
                      tone="sessions"
                    />

                  </div>

                </article>

              )
            )}

          </div>

        )
      }

    </section>

  );
}


function Reports() {

  const { user } =
    useAuth();


  const isSuperAdmin =
    user.role ===
    "super_admin";


  const reportDepartment =
    canonicalCollegeName(
      user.department
    );


  const filters =
    isSuperAdmin
      ? {}
      : {
          department:
            reportDepartment
        };


  const assessments =
    useRows(
      "assessments",
      filters
    );


  const consultations =
    useRows(
      "consultations",
      filters
    );


  const referrals =
    useRows(
      "referrals",
      filters
    );


  const scheduledSessions =
    consultations.filter(
      consultation =>
        consultation.status ===
        "Schedule for counseling"
    ).length;


  const counts =
    ANALYTICS_PRIORITIES.map(
      priority => ({

        priority,

        count:
          assessments.filter(
            assessment =>
              assessment.priority ===
              priority
          ).length

      })
    );


  const byCollege =
    operationalAnalyticsRows(
      assessments,
      consultations,
      "college"
    );


  const byProgram =
    operationalAnalyticsRows(
      assessments,
      consultations,
      "program"
    );


  const byGender =
    operationalAnalyticsRows(
      assessments,
      consultations,
      "gender"
    );


  const overallActivity =
    [
      {
        label:
          "Assessment cases",
        value:
          assessments.length,
        tone:
          "assessment"
      },
      {
        label:
          "Counseling requests",
        value:
          consultations.length,
        tone:
          "requests"
      },
      {
        label:
          "Scheduled sessions",
        value:
          scheduledSessions,
        tone:
          "sessions"
      },
      {
        label:
          "Referrals",
        value:
          referrals.length,
        tone:
          "referrals"
      },
      {
        label:
          "Reviewed cases",
        value:
          assessments.filter(
            assessment =>
              assessment.status &&
              assessment.status !==
              "For review"
          ).length,
        tone:
          "reviewed"
      }
    ];


  const missingGenderRecords =
    assessments.filter(
      record =>
        normalizedGender(
          record.gender
        ) ===
        "Not recorded"
    ).length +
    consultations.filter(
      record =>
        normalizedGender(
          record.gender
        ) ===
        "Not recorded"
    ).length;


  return (

    <>

      <PageTitle

        title="Reports and Analytics"

        subtitle={
          isSuperAdmin
            ? "Institution-wide assessment priority and counseling analytics by college, program, and gender."
            : `Assessment priority and counseling analytics for ${reportDepartment}.`
        }

      />


      <div className="stat-grid">


        <Stat

          title="Assessment cases"

          value={
            assessments.length
          }

          icon={
            <ClipboardList />
          }

        />


        <Stat

          title="Counseling requests"

          value={
            consultations.length
          }

          icon={
            <Calendar />
          }

        />


        <Stat

          title="Scheduled sessions"

          value={
            scheduledSessions
          }

          icon={
            <CheckCircle2 />
          }

        />


        <Stat

          title="Referrals"

          value={
            referrals.length
          }

          icon={
            <UserPlus />
          }

        />


        <Stat

          title="Reviewed cases"

          value={
            assessments.filter(
              assessment =>
                assessment.status &&
                assessment.status !==
                "For review"
            ).length
          }

          icon={
            <CheckCircle2 />
          }

        />

      </div>


      {missingGenderRecords > 0 && (

        <div className="notice analytics-data-note">

          {missingGenderRecords}
          {" "}
          historical assessment/counseling record
          {
            missingGenderRecords === 1
              ? ""
              : "s"
          }
          {" "}
          do not yet have gender recorded. They appear under
          {" "}
          <strong>
            Not recorded
          </strong>
          {" "}
          until the user updates their Profile and the optional backfill is rerun.

        </div>

      )}


      <AnalyticsSummaryBarChart
        title="Overall activity"
        description="A quick comparison of assessment, counseling, referral, and reviewed-case totals."
        rows={overallActivity}
      />


      <AnalyticsSummaryBarChart
        title="Overall assessment priority"
        description='Assessment cases are grouped into Low, Moderate, High, and Critical priority levels.'
        rows={
          counts.map(
            item => ({
              label:
                item.priority,
              value:
                item.count,
              tone:
                item.priority
                  .toLowerCase()
            })
          )
        }
      />


      <OperationalAnalyticsBarChart
        title="Analytics by college"
        description="Assessment priority levels, assessment-case totals, counseling requests, and scheduled sessions are shown for each college."
        rows={byCollege}
      />


      <OperationalAnalyticsBarChart
        title="Analytics by program"
        description="Student programs are shown individually. Teaching and Non-teaching records without a program appear as Not applicable."
        rows={byProgram}
      />


      <OperationalAnalyticsBarChart
        title="Analytics by gender"
        description="Male and Female totals use the gender stored on the account and copied into each assessment and counseling record."
        rows={byGender}
      />


      <section className="panel analytics-print-panel">

        <button

          className="secondary-button"

          onClick={
            () =>
              window.print()
          }

        >

          Print report

        </button>

      </section>


      {isSuperAdmin && (
        <FeedbackAnalytics />
      )}

    </>

  );
}


// ======================================================
// REUSABLE COMPONENTS
// ======================================================

function PageTitle({
  title,
  subtitle
}) {

  return (

    <div className="page-title">

      <h1>
        {title}
      </h1>

      <p>
        {subtitle}
      </p>

    </div>

  );

}


function Stat({
  title,
  value,
  icon,
  danger,
  warning
}) {

  return (

    <div
      className={
        `stat-card ${
          danger
            ? "danger"
            : warning
              ? "warning"
              : ""
        }`
      }
    >

      <div>
        {icon}
      </div>

      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>

    </div>

  );

}


function ActionLink({
  href,
  title,
  text,
  icon: Icon
}) {

  return (

    <a
      href={href}
      className="action-card"
    >

      {Icon && (

        <span className="action-card-icon">
          <Icon
            size={28}
            strokeWidth={2.2}
          />
        </span>

      )}


      <span className="action-card-copy">

        <strong>
          {title}
        </strong>

        <p>
          {text}
        </p>

      </span>

    </a>

  );

}


function Empty({
  text
}) {

  return (

    <div className="empty">
      {text}
    </div>

  );

}


// ======================================================
// ASSESSMENT ACCOUNT TABLE
// Counselor / Super Admin
// One account per row; scores stay inside Review.
// ======================================================

function AssessmentAccountTable({
  rows,
  onSelect,
  showCollege = false
}) {

  if (!rows.length) {

    return (
      <Empty
        text="No assessment cases yet."
      />
    );

  }


  return (

    <div className="table-wrap">

      <table className="assessment-account-table">

        <thead>

          <tr>

            <th>
              User
            </th>


            {showCollege && (

              <th>
                College / Office
              </th>

            )}


            <th>
              Program
            </th>


            <th>
              Latest Priority
            </th>


            <th>
              Latest Status
            </th>


            <th>
              Assessments
            </th>


            <th>
              Action
            </th>

          </tr>

        </thead>


        <tbody>

          {rows.map(
            row => (

              <tr
                key={
                  row.assessmentOwnerKey ||
                  row.ownerId ||
                  row.id
                }
              >

                <td>

                  <strong>
                    {
                      row.ownerName ||
                      "User"
                    }
                  </strong>

                </td>


                {showCollege && (

                  <td>
                    {
                      counselorCollegeLabel(
                        row.department
                      )
                    }
                  </td>

                )}


                <td>
                  {
                    counselorProgramLabel(
                      row.program
                    )
                  }
                </td>


                <td>

                  <span
                    className={
                      priorityClassName(
                        row.priority
                      )
                    }
                  >
                    {
                      row.priority ||
                      "No priority"
                    }
                  </span>

                </td>


                <td>
                  {
                    assessmentCaseStatusLabel(
                      row.status
                    )
                  }
                </td>


                <td>

                  <span className="assessment-count-badge">
                    {
                      row.assessmentCount ||
                      1
                    }
                  </span>

                </td>


                <td>

                  <button

                    type="button"

                    className="text-button"

                    onClick={
                      () =>
                        onSelect(
                          row
                        )
                    }

                  >
                    Review
                  </button>

                </td>

              </tr>

            )
          )}

        </tbody>

      </table>

    </div>

  );
}


// ======================================================
// CASE TABLE
// ======================================================

function CaseTable({
  rows,
  onSelect,
  showCollege = false
}) {

  if (!rows.length) {

    return (
      <Empty
        text="No records yet."
      />
    );

  }


  return (

    <div className="table-wrap">

      <table>


        <thead>

          <tr>

            <th>
              User
            </th>

            {showCollege && (

              <th>
                College / Office
              </th>

            )}

            <th>
              Program
            </th>

            <th>
              WHO-5
            </th>

            <th>
              PHQ-9
            </th>

            <th>
              GAD-7
            </th>

            <th>
              DASS-21
            </th>

            <th>
              Monitoring Priority
            </th>

            <th>
              Status
            </th>

            {onSelect && (

              <th>
                Action
              </th>

            )}

          </tr>

        </thead>


        <tbody>


          {rows.map(
            row => {

              const standardized =
                Boolean(
                  row.instrumentResults
                );


              return (

                <tr
                  key={
                    row.id
                  }
                >

                  <td>

                    {
                      row.ownerName ||
                      "Current user"
                    }

                  </td>


                  {showCollege && (

                    <td>

                      {
                        counselorCollegeLabel(
                          row.department
                        )
                      }

                    </td>

                  )}


                  <td>

                    {
                      counselorProgramLabel(
                        row.program
                      )
                    }

                  </td>


                  <td>

                    {standardized

                      ? (
                        <>
                          {
                            row.instrumentResults
                              ?.who5
                              ?.percentageScore
                          }/100
                        </>
                      )

                      : (
                        row.score ??
                        "—"
                      )
                    }

                  </td>


                  <td>

                    {standardized

                      ? (
                        <>
                          {
                            row.instrumentResults
                              ?.phq9
                              ?.totalScore
                          }/27
                        </>
                      )

                      : "—"
                    }

                  </td>


                  <td>

                    {standardized

                      ? (
                        <>
                          {
                            row.instrumentResults
                              ?.gad7
                              ?.totalScore
                          }/21
                        </>
                      )

                      : "—"
                    }

                  </td>

                  <td>

                    {standardized &&
                    row.instrumentResults
                      ?.dass21

                      ? (
                        row.instrumentResults
                          .dass21
                          .depression

                          ? (

                            <div className="dass21-table-scores">

                              <span>
                                D:
                                {" "}
                                {
                                  row.instrumentResults
                                    .dass21
                                    .depression
                                    .adjustedScore
                                }/42
                              </span>

                              <span>
                                A:
                                {" "}
                                {
                                  row.instrumentResults
                                    .dass21
                                    .anxiety
                                    .adjustedScore
                                }/42
                              </span>

                              <span>
                                S:
                                {" "}
                                {
                                  row.instrumentResults
                                    .dass21
                                    .stress
                                    .adjustedScore
                                }/42
                              </span>

                            </div>

                          )

                          : (
                            <>
                              Legacy:
                              {" "}
                              {
                                row.instrumentResults
                                  .dass21
                                  .totalScore ??
                                "—"
                              }/63
                            </>
                          )
                      )

                      : "—"
                    }

                  </td>


                  <td>

                    <span
                      className={
                        priorityClassName(
                          row.priority
                        )
                      }
                    >

                      {
                        row.priority ||
                        "—"
                      }

                    </span>

                  </td>


                  <td>
                    {
                      assessmentCaseStatusLabel(
                        row.status
                      )
                    }
                  </td>


                  {onSelect && (

                    <td>

                      <button

                        className="text-button"

                        onClick={
                          () =>
                            onSelect(
                              row
                            )
                        }

                      >

                        Review

                      </button>

                    </td>

                  )}

                </tr>

              );
            }
          )}

        </tbody>

      </table>

    </div>

  );

}


// ======================================================
// APP ROUTES
// ======================================================

export default function App() {

  return (

    <Routes>


      {/* PUBLIC HOME PAGE */}

      <Route

        path="/"

        element={
          <Home />
        }

      />


      {/* PUBLIC LOGIN */}

      <Route

        path="/login"

        element={
          <Login />
        }

      />


      {/* PUBLIC REGISTRATION */}

      <Route

        path="/register"

        element={
          <Register />
        }

      />


      {/* PROTECTED MINDTRACK PAGES */}

      <Route

        path="/*"

        element={

          <Protected>

            <Layout>

              <Routes>


                <Route

                  path="/dashboard"

                  element={
                    <DashboardRoute />
                  }

                />


                <Route

                  path="/assessment"

                  element={
                    <Assessment />
                  }

                />


                <Route

                  path="/monitoring"

                  element={
                    <Monitoring />
                  }

                />


                <Route

                  path="/notifications"

                  element={
                    <Notifications />
                  }

                />


                <Route

                  path="/consultations"

                  element={
                    <Consultations />
                  }

                />


                <Route

                  path="/referrals"

                  element={
                    <Referrals />
                  }

                />

                <Route

                  path="/feedback"

                  element={
                    <Feedback />
                  }

                />


                <Route

                  path="/profile"

                  element={
                    <Profile />
                  }

                />

                <Route

                  path="/user-profiles"

                  element={
                    <UserProfiles />
                  }

                />


                <Route

                  path="/history"

                  element={
                    <History />
                  }

                />


                <Route

                  path="/cases"

                  element={
                    <Cases />
                  }

                />


                <Route

                  path="/counseling-requests"

                  element={
                    <CounselingRequestsManagement />
                  }

                />


                <Route

                  path="/schedule"

                  element={
                    <Schedule />
                  }

                />


                <Route

                  path="/accounts"

                  element={
                    <Accounts />
                  }

                />


                <Route

                  path="/reports"

                  element={
                    <Reports />
                  }

                />


                <Route

                  path="*"

                  element={

                    <Navigate

                      to="/dashboard"

                      replace

                    />

                  }

                />


              </Routes>

            </Layout>

          </Protected>

        }

      />


    </Routes>

  );

}