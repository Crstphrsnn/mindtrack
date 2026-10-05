import React, { useEffect, useMemo, useRef, useState } from "react";
import psuLogo from "./assets/psu-logo.jpg";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
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


function RoleProtected({
  children,
  allowedRoles = []
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-screen">
        Loading MindTrack…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return allowedRoles.includes(user.role)
    ? children
    : <Navigate to="/dashboard" replace />;
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


const COLLEGE_OPTIONS =
  Object.keys(
    PROGRAMS_BY_COLLEGE
  );


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
    preferredCounselorId: "",
    department: "",
    program: "",
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
      "counselorDirectory",
      {
        active:
          true
      }
    );


  const activeRegistrationCounselors =
    [...counselorDirectoryRows]
      .filter(
        counselor =>
          counselor.active ===
            true &&
          String(
            counselor.counselorId ||
            counselor.id ||
            ""
          ).trim() &&
          String(
            counselor.name ||
            ""
          ).trim() &&
          String(
            counselor.department ||
            ""
          ).trim()
      )
      .sort(
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


  const selectedRegistrationCounselor =
    activeRegistrationCounselors.find(
      counselor =>
        String(
          counselor.counselorId ||
          counselor.id
        ) ===
        form.preferredCounselorId
    ) ||
    null;


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

          role:
            nextValue,

          preferredCounselorId:
            "",

          department:
            "",

          program:
            ""
        };
      }


      if (
        name ===
        "department"
      ) {

        return {
          ...current,

          department:
            nextValue,

          program:
            ""
        };
      }


      if (
        name ===
        "preferredCounselorId"
      ) {

        const selectedCounselor =
          activeRegistrationCounselors.find(
            counselor =>
              String(
                counselor.counselorId ||
                counselor.id
              ) ===
              nextValue
          );


        return {
          ...current,

          preferredCounselorId:
            nextValue,

          department:
            String(
              selectedCounselor?.department ||
              ""
            ).trim(),

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

    const choosesPreferredCounselor =
      [
        "teaching",
        "non_teaching"
      ].includes(
        form.role
      );


    let registrationDepartment =
      String(
        form.department ||
        ""
      ).trim();


    let selectedCounselorId =
      "";

    let selectedCounselorName =
      "";

    let selectedCounselorDepartment =
      "";


    if (
      form.role ===
      "student"
    ) {

      if (
        !registrationDepartment
      ) {

        setError(
          "Please select your college or office."
        );

        return;
      }

    } else if (
      choosesPreferredCounselor
    ) {

      if (
        counselorDirectoryRows.loading
      ) {

        setError(
          "Please wait while the counselor list is loading."
        );

        return;
      }


      if (
        counselorDirectoryRows.error
      ) {

        setError(
          "Unable to load the Guidance Counselor list. Please refresh the page or contact the Super Admin."
        );

        return;
      }


      if (
        !form.preferredCounselorId ||
        !selectedRegistrationCounselor
      ) {

        setError(
          "Please select your preferred Guidance Counselor."
        );

        return;
      }


      if (
        selectedRegistrationCounselor.active !==
        true
      ) {

        setError(
          "The selected Guidance Counselor is not currently available. Please select another counselor."
        );

        return;
      }


      selectedCounselorId =
        String(
          selectedRegistrationCounselor.counselorId ||
          selectedRegistrationCounselor.id ||
          ""
        ).trim();


      selectedCounselorName =
        String(
          selectedRegistrationCounselor.name ||
          ""
        ).trim();


      selectedCounselorDepartment =
        String(
          selectedRegistrationCounselor.department ||
          ""
        ).trim();


      if (
        !selectedCounselorId ||
        !selectedCounselorName ||
        !selectedCounselorDepartment
      ) {

        setError(
          "The selected Guidance Counselor does not have a valid counselor-directory record."
        );

        return;
      }


      registrationDepartment =
        selectedCounselorDepartment;
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
      ![
        "Male",
        "Female"
      ].includes(
        form.gender
      )
    ) {
      setError(
        "Please select your sex."
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
        role:
          form.role,

        department:
          registrationDepartment,

        program:
          form.role ===
            "student"
            ? form.program
            : "",

        assignedCounselorId:
          choosesPreferredCounselor
            ? selectedCounselorId
            : "",

        assignedCounselorName:
          choosesPreferredCounselor
            ? selectedCounselorName
            : "",

        assignedCounselorDepartment:
          choosesPreferredCounselor
            ? selectedCounselorDepartment
            : "",

        userNumber:
          form.userNumber,
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
                    value={
                      form.department
                    }
                    onChange={
                      change
                    }
                    required
                  >

                    <option
                      value=""
                      disabled
                    >
                      Select college / office
                    </option>

                    {
                      COLLEGE_OPTIONS.map(
                        college => (

                          <option
                            key={
                              college
                            }
                            value={
                              college
                            }
                          >
                            {college}
                          </option>

                        )
                      )
                    }

                  </select>
                </label>

              )}


              {
                [
                  "teaching",
                  "non_teaching"
                ].includes(
                  form.role
                ) && (

                  <label>
                    Preferred Guidance Counselor
                    <span
                      className="required-asterisk"
                      aria-hidden="true"
                    >
                      *
                    </span>

                    <select
                      name="preferredCounselorId"
                      value={
                        form.preferredCounselorId
                      }
                      onChange={
                        change
                      }
                      disabled={
                        counselorDirectoryRows.loading
                      }
                      required
                    >

                      <option
                        value=""
                        disabled
                      >
                        {
                          counselorDirectoryRows.loading
                            ? "Loading counselors..."
                            : "Select preferred counselor"
                        }
                      </option>

                      {
                        activeRegistrationCounselors.map(
                          counselor => {

                            const counselorId =
                              String(
                                counselor.counselorId ||
                                counselor.id
                              );


                            return (

                              <option
                                key={
                                  counselorId
                                }
                                value={
                                  counselorId
                                }
                              >
                                {
                                  counselor.name
                                }
                                {" — "}
                                {
                                  counselor.department
                                }
                              </option>

                            );
                          }
                        )
                      }

                    </select>


                    {
                      selectedRegistrationCounselor &&
                      (

                        <span
                          className="optional-text"
                          style={{
                            display:
                              "block",

                            marginTop:
                              "6px"
                          }}
                        >
                          College / Office:
                          {" "}
                          {
                            selectedRegistrationCounselor.department
                          }
                        </span>

                      )
                    }


                    {
                      counselorDirectoryRows.error &&
                      (

                        <span
                          style={{
                            display:
                              "block",

                            marginTop:
                              "6px",

                            color:
                              "#b91c1c",

                            fontSize:
                              "0.82rem"
                          }}
                        >
                          Unable to load available counselors.
                        </span>

                      )
                    }

                  </label>

                )
              }


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
                  : form.role === "teaching" ||
                      form.role === "non_teaching"
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
                Sex
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
                    Select sex
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

      setLoading(true);
      setError("");

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


      if (filters.requestedById) {

        constraints.push(
          where(
            "requestedById",
            "==",
            filters.requestedById
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

            setError("");
            setLoading(false);
          },

          firestoreError => {

            console.error(
              `Unable to load ${name}:`,
              firestoreError
            );


            if (
              firestoreError?.code ===
              "permission-denied"
            ) {

              setError(
                `You do not have permission to load ${name}.`
              );

            } else if (
              firestoreError?.code ===
              "unavailable"
            ) {

              setError(
                "Unable to connect to Firebase. Check your internet connection and try again."
              );

            } else {

              setError(
                `Unable to load ${name}. Please try again.`
              );
            }


            // Keep the most recently loaded rows instead of replacing
            // a Firestore failure with an artificial empty result.
            setLoading(false);
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
      filters.requestedById,
      filters.assignedCounselorId,
      filters.counselorId,
      filters.active
    ]
  );


  // Return an Array so all existing .map(), .filter(), .find(),
  // .length, and spread usages keep working. The extra properties
  // expose the Firestore loading/error state to each page.
  const result =
    [...rows];

  result.loading =
    loading;

  result.error =
    error;

  return result;
}


function rowsAreLoading(
  ...sources
) {

  return sources.some(
    source =>
      Boolean(
        source?.loading
      )
  );
}


function firstRowsError(
  ...sources
) {

  return (
    sources
      .map(
        source =>
          source?.error ||
          ""
      )
      .find(Boolean) ||
    ""
  );
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


function appointmentHasStarted(row) {

  if (!row?.date || !row?.time) {
    return false;
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

  const date = new Date(
    `${row.date}T${normalizedTime}`
  );

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return Date.now() >= date.getTime();
}


function counselingScheduledAtDate(
  row
) {

  if (
    !row?.date ||
    !row?.time
  ) {

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
    timeMap[
      row.time
    ] ||
    row.time;


  const scheduledAt =
    new Date(
      `${row.date}T${normalizedTime}`
    );


  return Number.isNaN(
    scheduledAt.getTime()
  )
    ? null
    : scheduledAt;
}


// ======================================================
// DASHBOARD ACCESS
// Student / Teaching / Non-teaching users do not use Dashboard.
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
            assignedCounselorId:
              user.id
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


  const counselorAccounts =
    useRows(
      "users",
      isCounselor
        ? {
            role:
              "counselor"
          }
        : {
            id:
              "__NO_ACCESS__"
          }
    );


  // This is a live Firestore query. As soon as one counselor changes a
  // transfer from Pending approval to Approved, the request is removed from
  // every other counselor's pending list. The transaction below is still the
  // final authority, so two counselors cannot accept the same request.
  const pendingTransferRequests =
    pendingTransferRows.filter(
      row =>
        isCounselor &&
        row.requestedById !==
          user.id
    );


  const [
    approvingTransferId,
    setApprovingTransferId
  ] = useState("");


  const [
    unavailableTransferIds,
    setUnavailableTransferIds
  ] = useState(
    () =>
      new Set()
  );


  const dashboardLoading =
    rowsAreLoading(
      assessments,
      consultations,
      referrals,
      ...(
        isCounselor
          ? [
              pendingTransferRows,
              counselorAccounts
            ]
          : []
      )
    );


  const dashboardError =
    firstRowsError(
      assessments,
      consultations,
      referrals,
      ...(
        isCounselor
          ? [
              pendingTransferRows,
              counselorAccounts
            ]
          : []
      )
    );


  useEffect(
    () => {

      const pendingIds =
        new Set(
          pendingTransferRequests.map(
            row =>
              row.id
          )
        );


      setUnavailableTransferIds(
        current => {

          const next =
            new Set(
              Array.from(
                current
              ).filter(
                id =>
                  pendingIds.has(
                    id
                  )
              )
            );


          if (
            next.size ===
            current.size &&
            Array.from(
              next
            ).every(
              id =>
                current.has(
                  id
                )
            )
          ) {

            return current;
          }


          return next;
        }
      );
    },
    [
      pendingTransferRequests
    ]
  );


  async function approveTransfer(
    transfer
  ) {

    if (!isCounselor) {
      return;
    }


    if (
      transfer.status !==
        "Pending approval" ||
      unavailableTransferIds.has(
        transfer.id
      )
    ) {

      alert(
        "This transfer request has already been accepted or is no longer available."
      );

      return;
    }


    if (
      appointmentHasStarted(
        transfer
      )
    ) {

      alert(
        "This counseling schedule has already started or passed. The transfer can no longer be accepted."
      );

      return;
    }


    if (
      !window.confirm(
        `Approve the counselor transfer for ${transfer.ownerName || "this user"}? You will become the assigned counselor for this scheduled counseling request.`
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


          const profileSnap =
            await transaction.get(
              profileRef
            );


          if (!transferSnap.exists()) {
            throw new Error(
              "This transfer request no longer exists."
            );
          }


          const current =
            transferSnap.data();


          if (
            current.scheduledAt &&
            typeof current.scheduledAt.toMillis ===
              "function" &&
            Date.now() >=
              current.scheduledAt.toMillis()
          ) {

            throw new Error(
              "This counseling schedule has already started or passed. The transfer can no longer be accepted."
            );
          }


          const existingProfile =
            profileSnap.exists()
              ? profileSnap.data()
              : {};


          const previousCounselorIds =
            Array.from(
              new Set([
                ...(
                  Array.isArray(
                    existingProfile.previousCounselorIds
                  )
                    ? existingProfile.previousCounselorIds
                    : []
                ),

                current.requestedById
              ].filter(Boolean))
            );


          const previousCounselorNames =
            Array.from(
              new Set([
                ...(
                  Array.isArray(
                    existingProfile.previousCounselorNames
                  )
                    ? existingProfile.previousCounselorNames
                    : []
                ),

                current.requestedByName
              ].filter(Boolean))
            );


          const oldSlotRef =
            current.requestedById &&
            current.date &&
            current.time
              ? doc(
                  db,
                  "counselingScheduleSlots",
                  counselingSlotDocumentId(
                    current.requestedById,
                    current.date,
                    current.time
                  )
                )
              : null;


          const newSlotRef =
            current.date &&
            current.time
              ? doc(
                  db,
                  "counselingScheduleSlots",
                  counselingSlotDocumentId(
                    user.id,
                    current.date,
                    current.time
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

              previousCounselorIds,

              previousCounselorNames,

              transferredAt:
                serverTimestamp(),

              lastTransferId:
                transfer.id,

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
                  current.date,

                time:
                  current.time,

                consultationId:
                  current.consultationId,

                assignmentSourceConsultationId:
                  current.consultationId,

                state:
                  "booked",

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


      const otherCounselors =
        counselorAccounts.filter(
          counselor =>
            counselor.id !==
              user.id &&
            counselor.id !==
              transfer.requestedById
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
              `${user.name || "A Guidance Counselor"} approved the transfer and is now assigned to your scheduled counseling request. Your counseling schedule remains available in MindTrack.`,

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
              `${user.name || "Another counselor"} accepted the transfer for ${transfer.ownerName || "the user"}. The original transfer record remains available for documentation.`,

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
        ),

        ...otherCounselors.map(
          counselor =>
            addRecord(
              "notifications",
              {
                ownerId:
                  counselor.id,

                title:
                  "Transfer request already accepted",

                message:
                  `${user.name || "Another counselor"} accepted the transfer for ${transfer.ownerName || "the user"}. No further action is needed.`,

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
        )
      ]);


      setUnavailableTransferIds(
        current => {

          const next =
            new Set(
              current
            );


          next.add(
            transfer.id
          );


          return next;
        }
      );


      alert(
        `Transfer approved. ${transfer.ownerName || "The user"} is now assigned to you for the scheduled counseling request.`
      );

    } catch (error) {

      console.error(
        "Unable to approve counselor transfer:",
        error
      );


      const errorMessage =
        String(
          error?.message ||
          ""
        );


      const alreadyHandled =
        errorMessage.includes(
          "already been handled"
        ) ||
        errorMessage.includes(
          "no longer exists"
        ) ||
        errorMessage.includes(
          "Missing or insufficient permissions"
        ) ||
        error?.code ===
          "permission-denied" ||
        error?.code ===
          "firestore/permission-denied";


      if (
        alreadyHandled
      ) {

        setUnavailableTransferIds(
          current => {

            const next =
              new Set(
                current
              );


            next.add(
              transfer.id
            );


            return next;
          }
        );


        alert(
          "This transfer request has already been accepted by another counselor and is no longer available."
        );

      } else {

        alert(
          error?.message ||
          "Unable to approve the counselor transfer."
        );
      }

    } finally {

      setApprovingTransferId(
        ""
      );
    }
  }


  if (
    (
      isCounselor ||
      isSuperAdmin
    ) &&
    dashboardLoading
  ) {

    return (
      <>
        <PageTitle
          title={
            isSuperAdmin
              ? "Super Admin Dashboard"
              : "Counselor Dashboard"
          }
          subtitle="Live case monitoring and counseling operations"
        />

        <section className="panel">
          <Empty
            text="Loading dashboard data..."
          />
        </section>
      </>
    );
  }


  if (
    (
      isCounselor ||
      isSuperAdmin
    ) &&
    dashboardError
  ) {

    return (
      <>
        <PageTitle
          title={
            isSuperAdmin
              ? "Super Admin Dashboard"
              : "Counselor Dashboard"
          }
          subtitle="Live case monitoring and counseling operations"
        />

        <div className="error-box">
          {dashboardError}
          <br />
          Dashboard totals are unavailable until the data loads successfully.
        </div>
      </>
    );
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
                  Counselor Transfer Requests
                </h2>

                <p>
                  These scheduled counseling cases are waiting for another counselor to accept the transfer.
                </p>

              </div>


              <span className="transfer-count-badge">
                {pendingTransferRequests.length}
              </span>

            </div>


            {pendingTransferRequests.length === 0

              ? (

                <div className="transfer-empty-state">
                  No users are currently waiting for counselor transfer approval.
                </div>

              )

              : (

                <div className="transfer-request-grid">

                  {pendingTransferRequests.map(
                    transfer => (

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
                            Schedule: {transfer.date || "No date"} · {transfer.time || "No time"}
                          </small>

                          <small>
                            Requested by: {transfer.requestedByName || "Counselor"}
                          </small>

                          {transfer.reason && (
                            <small>
                              Reason: {transfer.reason}
                            </small>
                          )}

                        </div>


                        <button
                          type="button"
                          className="primary-button"
                          disabled={
                            approvingTransferId ===
                              transfer.id ||
                            transfer.status !==
                              "Pending approval" ||
                            unavailableTransferIds.has(
                              transfer.id
                            )
                          }
                          onClick={
                            () =>
                              approveTransfer(
                                transfer
                              )
                          }
                        >
                          {
                            approvingTransferId ===
                            transfer.id
                              ? "Approving..."
                              : (
                                  transfer.status !==
                                    "Pending approval" ||
                                  unavailableTransferIds.has(
                                    transfer.id
                                  )
                                )
                                ? "Already accepted"
                                : "Accept transfer"
                          }
                        </button>

                      </article>
                    )
                  )}

                </div>

              )
            }

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


          {REFERRAL_USER_ROLE_VALUES.includes(
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


  const assessmentHistory =
    useRows(
      "assessments",
      {
        ownerId:
          user.id
      }
    );


  const assessmentLocks =
    useRows(
      "assessmentLocks",
      {
        ownerId:
          user.id
      }
    );


  const assessmentLock =
    assessmentLocks[0] ||
    null;


  const latestAssessment =
    assessmentHistory[0] ||
    null;


  const activeAssessment =
    assessmentHistory.find(
      row =>
        row.status !==
        "Concluded"
    ) ||
    null;


  const ASSESSMENT_COOLDOWN_DAYS =
    14;


  const ASSESSMENT_COOLDOWN_MS =
    ASSESSMENT_COOLDOWN_DAYS *
    24 *
    60 *
    60 *
    1000;


  function assessmentTimestampMillis(
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


  const concludedAtMillis =
    assessmentLock?.status ===
      "Concluded"

      ? assessmentTimestampMillis(
          assessmentLock.concludedAt
        )

      : (
          latestAssessment?.status ===
            "Concluded"

            ? assessmentTimestampMillis(
                latestAssessment.updatedAt ||
                latestAssessment.createdAt
              )

            : 0
        );


  const nextAssessmentAtMillis =
    concludedAtMillis
      ? (
          concludedAtMillis +
          ASSESSMENT_COOLDOWN_MS
        )
      : 0;


  const cooldownBlocked =
    Boolean(
      !activeAssessment &&
      latestAssessment?.status ===
        "Concluded" &&
      (
        !nextAssessmentAtMillis ||
        Date.now() <
          nextAssessmentAtMillis
      )
    );


  const assessmentEligibilityLoading =
    rowsAreLoading(
      assessmentHistory,
      assessmentLocks
    );


  const assessmentEligibilityError =
    firstRowsError(
      assessmentHistory,
      assessmentLocks
    );


  const assessmentLockMissing =
    !assessmentEligibilityLoading &&
    !assessmentEligibilityError &&
    !assessmentLock;


  const assessmentBlocked =
    Boolean(
      assessmentLockMissing ||
      activeAssessment ||
      cooldownBlocked
    );


  const nextAssessmentDateLabel =
    nextAssessmentAtMillis
      ? new Date(
          nextAssessmentAtMillis
        ).toLocaleString(
          "en-PH",
          {
            dateStyle:
              "medium",

            timeStyle:
              "short"
          }
        )
      : "";


  const answeredQuestionCount =
    scoredQuestionIds.filter(
      questionId =>
        answers[
          questionId
        ] !== undefined
    ).length;


  const totalQuestionCount =
    scoredQuestionIds.length;


  const assessmentProgress =
    totalQuestionCount
      ? Math.round(
          (
            answeredQuestionCount /
            totalQuestionCount
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
              choicesList.length >= 4
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


    if (assessmentBlocked) {

      alert(
        activeAssessment
          ? "You already have an active psychological assessment. A new assessment can only be taken after the current assessment is concluded."
          : cooldownBlocked
            ? `A new psychological assessment will be available after the 14-day reassessment period${nextAssessmentDateLabel ? ` (${nextAssessmentDateLabel})` : "."}`
            : "Your assessment eligibility record is not ready. Please contact the Guidance Office or Super Admin."
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

      department:
        user.department,

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


    try {

      const assessmentRef =
        doc(
          collection(
            db,
            "assessments"
          )
        );


      const lockRef =
        doc(
          db,
          "assessmentLocks",
          user.id
        );


      await runTransaction(
        db,

        async transaction => {

          const lockSnapshot =
            await transaction.get(
              lockRef
            );


          if (!lockSnapshot.exists()) {

            throw new Error(
              "Your assessment eligibility record is missing. Please contact the Guidance Office or Super Admin."
            );
          }


          const lockData =
            lockSnapshot.data();


          if (
            lockData.ownerId !==
            user.id
          ) {

            throw new Error(
              "The assessment eligibility record is invalid."
            );
          }


          if (
            lockData.status !==
              "Eligible" &&
            lockData.status !==
              "Concluded"
          ) {

            throw new Error(
              "You already have an active psychological assessment. Wait until the current assessment is concluded."
            );
          }


          if (
            lockData.status ===
              "Concluded"
          ) {

            const lockConcludedAt =
              assessmentTimestampMillis(
                lockData.concludedAt
              );


            if (!lockConcludedAt) {

              throw new Error(
                "Your previous assessment does not yet have a valid conclusion date. Please contact your counselor."
              );
            }


            const eligibleAt =
              lockConcludedAt +
              ASSESSMENT_COOLDOWN_MS;


            if (
              Date.now() <
              eligibleAt
            ) {

              throw new Error(
                `Your next psychological assessment will be available on ${new Date(eligibleAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}. The 14-day cooldown cannot be bypassed.`
              );
            }
          }


          transaction.set(
            assessmentRef,
            {
              ...record,

              createdAt:
                serverTimestamp()
            }
          );


          transaction.update(
            lockRef,
            {
              latestAssessmentId:
                assessmentRef.id,

              status:
                "For review",

              concludedAt:
                null,

              earlyReassessmentAllowed:
                false,

              updatedAt:
                serverTimestamp()
            }
          );
        }
      );


      setSaved(
        result
      );

    } catch (assessmentError) {

      console.error(
        "Psychological assessment submission error:",
        assessmentError
      );


      alert(
        assessmentError?.message ||
        "Unable to submit the psychological assessment."
      );
    }

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


        <div className="notice">

          Your assessment was submitted successfully.
          Individual WHO-5, PHQ-9, GAD-7, and DASS-21 scores
          are intentionally not displayed on this page.
          The detailed screening results remain available
          to authorized Guidance Counselors for review.

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


  if (
    assessmentEligibilityLoading
  ) {

    return (
      <>
        <PageTitle
          title="Psychological Assessment"
          subtitle="Checking whether a new psychological assessment is currently available."
        />

        <section className="panel">
          <Empty
            text="Checking assessment eligibility..."
          />
        </section>
      </>
    );
  }


  if (
    assessmentEligibilityError
  ) {

    return (
      <>
        <PageTitle
          title="Psychological Assessment"
          subtitle="Psychological assessment availability could not be checked."
        />

        <div className="error-box">
          {assessmentEligibilityError}
        </div>
      </>
    );
  }


  if (assessmentBlocked) {

    const blockedStatus =
      activeAssessment?.status ||
      (
        cooldownBlocked
          ? "Reassessment cooldown"
          : "Eligibility unavailable"
      );


    return (
      <>
        <PageTitle
          title="Psychological Assessment"
          subtitle="MindTrack limits repeated assessments to prevent duplicate or spam submissions."
        />

        <section
          className="panel"
          style={{
            width: "100%",
            maxWidth: "950px",
            boxSizing: "border-box",
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >

          <h2>
            New assessment temporarily unavailable
          </h2>


          <p>
            Current status:
            {" "}
            <strong>
              {blockedStatus}
            </strong>
          </p>


          {activeAssessment && (

            <div className="notice">

              You already have a psychological assessment that is still active.
              A new assessment cannot be started while the current assessment is
              waiting for review, approved, recommended for counseling/follow-up,
              or otherwise not yet concluded.

            </div>

          )}


          {cooldownBlocked && (

            <div className="notice">

              Your previous assessment has been concluded.
              MindTrack requires a
              {" "}
              <strong>
                {ASSESSMENT_COOLDOWN_DAYS}-day reassessment period
              </strong>
              {" "}
              before another psychological assessment can be submitted.

              {nextAssessmentDateLabel && (
                <>
                  <br />
                  <br />
                  Next available:
                  {" "}
                  <strong>
                    {nextAssessmentDateLabel}
                  </strong>
                </>
              )}

            </div>

          )}


          {assessmentLockMissing && (

            <div className="error-box">

              Your assessment eligibility record has not been initialized yet.
              Ask the Super Admin to run the assessment-lock migration before
              taking a new assessment.

            </div>

          )}

        </section>
      </>
    );
  }


  return (

    <>

      <PageTitle

        title="Psychological Assessment"

        subtitle="Complete all four screening tools. Your progress is shown while you answer, while individual test scores remain hidden from this page."

      />


      <div
        className="assessment-simple-guide"
        style={{
          width: "100%",
          maxWidth: "950px",
          boxSizing: "border-box",
          marginLeft: "auto",
          marginRight: "auto",
          marginBottom: "18px"
        }}
      >

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


      <section
        className="panel assessment-sticky-progress"
        aria-label="Assessment progress"
        style={{
          position: "sticky",
          top: "72px",
          zIndex: 30,
          width: "100%",
          maxWidth: "950px",
          boxSizing: "border-box",
          overflow: "hidden",
          padding: "16px 20px",
          marginLeft: "auto",
          marginRight: "auto",
          marginBottom: "18px",
          boxShadow:
            "0 8px 24px rgba(15, 23, 42, 0.10)"
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "10px"
          }}
        >

          <div>

            <strong
              style={{
                display: "block"
              }}
            >
              Assessment Progress
            </strong>

            <small>
              {answeredQuestionCount}
              {" "}
              of
              {" "}
              {totalQuestionCount}
              {" "}
              questions answered
            </small>

          </div>


          <strong
            style={{
              color: "#132f73",
              fontSize: "1rem"
            }}
          >
            {assessmentProgress}%
          </strong>

        </div>


        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={assessmentProgress}
          aria-label="Overall psychological assessment completion"
          style={{
            display: "block",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            height: "10px",
            borderRadius: "999px",
            overflow: "hidden",
            background: "#e7ebf2"
          }}
        >

          <div
            style={{
              width:
                `${Math.min(
                  100,
                  Math.max(
                    0,
                    assessmentProgress
                  )
                )}%`,
              maxWidth: "100%",
              height: "100%",
              borderRadius: "999px",
              background: "#173f8f",
              transition:
                "width 180ms ease"
            }}
          />

        </div>

      </section>


      <form
        className="assessment-form standardized-assessment-form"
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: "950px",
          marginLeft: "auto",
          marginRight: "auto"
        }}
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

            <br />
            <br />

            MindTrack keeps the detailed result for authorized
            counselor review rather than displaying the score here.

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

            The PHQ-9 response set and functional difficulty response
            are recorded for authorized counselor review.

            <br />
            <br />

            Individual scoring details are intentionally not displayed
            while the user is completing the assessment.

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

            The GAD-7 responses are recorded for authorized
            counselor review and monitoring.

            <br />
            <br />

            Individual scoring details are intentionally not displayed
            while the user is completing the assessment.

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


          <div className="assessment-source-note">

            DASS-21 covers depression, anxiety, and stress response areas.
            MindTrack records the responses for authorized counselor review.

            <br />
            <br />

            Individual scoring details are intentionally not displayed
            while the user is completing the assessment.

          </div>

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


const TERMINAL_COUNSELING_REQUEST_STATUSES = [
  "Concluded",
  "Cancelled",

  // Legacy spelling kept so older records do not lock a user forever.
  "Canceled"
];


function counselingRequestIsTerminal(
  status
) {

  return TERMINAL_COUNSELING_REQUEST_STATUSES.includes(
    String(
      status ||
      ""
    ).trim()
  );
}


function counselingRequestIsActive(
  status
) {

  return !counselingRequestIsTerminal(
    status
  );
}


function superAdminDeleteConfirmed(
  recordLabel,
  ownerName
) {

  const confirmation =
    window.prompt(
      `Permanent Super Admin cleanup\n\nThis will permanently remove the selected ${recordLabel} and related test/erroneous records.\n\nUser: ${ownerName || "Unknown user"}\n\nType DELETE to continue.`
    );


  return confirmation ===
    "DELETE";
}


function recordTimestampMillis(
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

    return value.seconds *
      1000;
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


function newestRecordFirst(
  a,
  b
) {

  return (
    recordTimestampMillis(
      b.createdAt
    ) -
    recordTimestampMillis(
      a.createdAt
    )
  );
}


function uniqueDocumentReferences(
  references
) {

  return Array.from(
    new Map(
      references
        .filter(Boolean)
        .map(
          reference => [
            reference.path,
            reference
          ]
        )
    ).values()
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


const GENERAL_USER_ROLE_VALUES = [
  "student",
  "teaching",
  "non_teaching",

  // Legacy values kept temporarily so older Firestore
  // accounts continue to work until the migration is run.
  "faculty",
  "personnel"
];


const REFERRAL_USER_ROLE_VALUES = [
  "teaching",
  "non_teaching",

  // Legacy compatibility.
  "faculty",
  "personnel"
];


function generalUserRole(
  role
) {

  return GENERAL_USER_ROLE_VALUES.includes(
    String(
      role ||
      ""
    ).trim()
  );
}


function teachingUserRole(
  role
) {

  return [
    "teaching",
    "faculty"
  ].includes(
    String(
      role ||
      ""
    ).trim()
  );
}


function nonTeachingUserRole(
  role
) {

  return [
    "non_teaching",
    "personnel"
  ].includes(
    String(
      role ||
      ""
    ).trim()
  );
}


function systemRoleLabel(
  role
) {

  const cleanRole =
    String(
      role ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    cleanRole ===
    "student"
  ) {

    return "Student";
  }


  if (
    teachingUserRole(
      cleanRole
    )
  ) {

    return "Teaching";
  }


  if (
    nonTeachingUserRole(
      cleanRole
    )
  ) {

    return "Non-teaching";
  }


  if (
    cleanRole ===
    "counselor"
  ) {

    return "Counselor";
  }


  if (
    cleanRole ===
    "super_admin"
  ) {

    return "Super Admin";
  }


  return role ||
    "—";
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


  const counselingRequestLocks =
    useRows(
      "counselingRequestLocks",
      {
        ownerId:
          user.id
      }
    );


  const counselingRequestLock =
    counselingRequestLocks[0] ||
    null;


  const activeCounselingRequest =
    rows.find(
      row =>
        counselingRequestIsActive(
          row.status
        )
    ) ||
    null;


  const counselingRequestLockAllowsNew =
    Boolean(
      counselingRequestLock &&
      (
        counselingRequestLock.status ===
          "Eligible" ||
        counselingRequestIsTerminal(
          counselingRequestLock.status
        )
      )
    );


  const counselingRequestLimitBlocked =
    Boolean(
      activeCounselingRequest ||
      !counselingRequestLockAllowsNew
    );


  // Use the most recent counseling request that contains an
  // assigned counselor as the user's current counselor source.
  // This avoids exposing private counselingProfiles notes to
  // Student / Teaching / Non-teaching accounts.
  const currentCounselorAssignment =
    rows.find(
      row =>
        Boolean(
          row.assignedCounselorId
        )
    ) ||
    null;


  // New users may not have an older consultation carrying their
  // counselor assignment yet. Fall back to the active counselor
  // directory for the user's department, but only when exactly
  // one active counselor exists. This prevents a first request
  // from being saved without a counselor/slot reservation.
  const departmentCounselors =
    useRows(
      "counselorDirectory",
      {
        department:
          user.department
      }
    );


  const activeDepartmentCounselors =
    departmentCounselors.filter(
      counselor =>
        counselor.active ===
        true
    );


  const directoryCounselor =
    activeDepartmentCounselors.length ===
      1
      ? activeDepartmentCounselors[0]
      : null;


  const currentAssignedCounselorId =
    currentCounselorAssignment
      ?.assignedCounselorId ||
    user.assignedCounselorId ||
    directoryCounselor
      ?.counselorId ||
    directoryCounselor
      ?.id ||
    "";


  const currentAssignedCounselorName =
    currentCounselorAssignment
      ?.assignedCounselorName ||
    user.assignedCounselorName ||
    directoryCounselor
      ?.name ||
    "";


  const currentAssignedCounselorDepartment =
    currentCounselorAssignment
      ?.assignedCounselorDepartment ||
    user.assignedCounselorDepartment ||
    directoryCounselor
      ?.department ||
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


  const emptyRequest = {
    mode:
      "",

    date:
      "",

    time:
      "",

    category:
      "Academic concern",

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
      counselingRequestLimitBlocked
    ) {

      alert(
        activeCounselingRequest
          ? `You already have an active counseling request with status "${activeCounselingRequest.status || "Pending approval"}". Please wait until that request is concluded before submitting another request.`
          : "Your counseling-request eligibility record is not ready. Please contact the Guidance Office or Super Admin."
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
      !currentAssignedCounselorId
    ) {

      alert(
        activeDepartmentCounselors.length > 1
          ? "More than one active counselor is available for your department, but you do not have a unique assigned counselor yet. Please contact Guidance before submitting a schedule."
          : "No active assigned counselor was found for your department. Please contact Guidance before submitting a counseling request."
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


      const requestLockRef =
        doc(
          db,
          "counselingRequestLocks",
          user.id
        );


      await runTransaction(
        db,

        async transaction => {

          const requestLockSnapshot =
            await transaction.get(
              requestLockRef
            );


          if (
            !requestLockSnapshot.exists()
          ) {

            throw new Error(
              "Your counseling-request eligibility record is missing. Ask the Super Admin to run the counseling-request lock migration."
            );
          }


          const requestLockData =
            requestLockSnapshot.data();


          if (
            requestLockData.ownerId !==
            user.id
          ) {

            throw new Error(
              "Your counseling-request eligibility record is invalid."
            );
          }


          if (
            requestLockData.status !==
              "Eligible" &&
            !counselingRequestIsTerminal(
              requestLockData.status
            )
          ) {

            throw new Error(
              `You already have an active counseling request with status "${requestLockData.status || "Pending approval"}". Please wait until it is concluded before submitting another request.`
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

              department:
                user.department,

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


          transaction.update(
            requestLockRef,
            {
              latestConsultationId:
                consultationRef.id,

              status:
                "Pending approval",

              updatedAt:
                serverTimestamp()
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
                  consultationRef.id,

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
        row.category ||
        "Academic concern",

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


  const consultationsLoading =
    rowsAreLoading(
      rows,
      counselingRequestLocks,
      departmentCounselors,
      counselorScheduleSlots
    );


  const consultationsError =
    firstRowsError(
      rows,
      counselingRequestLocks,
      departmentCounselors,
      counselorScheduleSlots
    );


  if (consultationsLoading) {

    return (
      <>
        <PageTitle
          title="Counseling Requests"
          subtitle="Request counseling and track approval or rescheduling in real time."
        />

        <section className="panel">
          <Empty
            text="Loading counseling information..."
          />
        </section>
      </>
    );
  }


  if (consultationsError) {

    return (
      <>
        <PageTitle
          title="Counseling Requests"
          subtitle="Request counseling and track approval or rescheduling in real time."
        />

        <div className="error-box">
          {consultationsError}
          <br />
          Counseling availability and requests cannot be shown safely until the data loads successfully.
        </div>
      </>
    );
  }


  return (

    <>

      <PageTitle

        title="Counseling Requests"

        subtitle="Request counseling and track approval or rescheduling in real time."

      />


      <div className="two-column">


        {
          counselingRequestLimitBlocked

            ? (

              <section className="panel">

                <h2>
                  New counseling request temporarily unavailable
                </h2>


                {
                  activeCounselingRequest

                    ? (

                      <div className="notice">

                        You already have a counseling request that is still active.
                        MindTrack allows only
                        {" "}
                        <strong>
                          one active counseling request at a time
                        </strong>
                        {" "}
                        to prevent duplicate or spam submissions.

                        <br />
                        <br />

                        Current status:
                        {" "}
                        <strong>
                          {
                            activeCounselingRequest.status ||
                            "Pending approval"
                          }
                        </strong>

                        {
                          activeCounselingRequest.date &&
                          activeCounselingRequest.time &&
                          (
                            <>
                              <br />
                              Schedule:
                              {" "}
                              <strong>
                                {
                                  activeCounselingRequest.date
                                }
                                {" · "}
                                {
                                  activeCounselingRequest.time
                                }
                              </strong>
                            </>
                          )
                        }

                        <br />
                        <br />

                        You may submit another counseling request after the current
                        request is marked
                        {" "}
                        <strong>
                          Concluded
                        </strong>
                        {" "}
                        or is cancelled.

                      </div>

                    )

                    : (

                      <div className="error-box">

                        Your counseling-request eligibility record has not been
                        initialized yet. Ask the Super Admin to run the
                        counseling-request lock migration.

                      </div>

                    )
                }

              </section>

            )

            : (

        <form
          className="panel"
          onSubmit={submit}
        >

          <h2>
            New request
          </h2>


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

              <option>
                Academic concern
              </option>

              <option>
                Anxiety or stress
              </option>

              <option>
                Family concern
              </option>

              <option>
                Workplace concern
              </option>

              <option>
                Financial concern
              </option>

              <option>
                Other
              </option>

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

        </form>

            )
        }





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
            You may edit a request after submitting it.
            Changes are sent back for counselor review.
            Completed or cancelled requests can no longer be edited.
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

                                <option>
                                  Academic concern
                                </option>

                                <option>
                                  Anxiety or stress
                                </option>

                                <option>
                                  Family concern
                                </option>

                                <option>
                                  Workplace concern
                                </option>

                                <option>
                                  Financial concern
                                </option>

                                <option>
                                  Other
                                </option>

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


                            {row.assignedCounselorName && (

                              <div
                                style={{
                                  marginTop:
                                    "10px",

                                  padding:
                                    "9px 11px",

                                  borderRadius:
                                    "9px",

                                  background:
                                    "#f6f8fb",

                                  color:
                                    "#566174",

                                  fontSize:
                                    "0.84rem"
                                }}
                              >
                                Assigned counselor:
                                {" "}
                                <strong>
                                  {
                                    row.assignedCounselorName
                                  }
                                </strong>

                                {
                                  row.assignedCounselorDepartment &&
                                  (
                                    <>
                                      {" · "}
                                      {
                                        row.assignedCounselorDepartment
                                      }
                                    </>
                                  )
                                }
                              </div>

                            )}


                            {row.transferStatus ===
                              "Pending approval" && (

                              <div
                                className="notice"
                                style={{
                                  marginTop:
                                    "10px"
                                }}
                              >
                                Transfer approval pending. Your current counselor
                                remains assigned until another counselor accepts
                                the transfer.
                              </div>

                            )}


                            {row.transferStatus ===
                              "Approved" && (

                              <div
                                className="success-box"
                                style={{
                                  marginTop:
                                    "10px"
                                }}
                              >
                                <strong>
                                  Transferred
                                </strong>
                                {" — "}
                                {
                                  row.assignedCounselorName ||
                                  "A new Guidance Counselor"
                                }
                                {" "}
                                is now assigned to this counseling request.
                              </div>

                            )}


                            {row.counselorRemarks && (

                              <small>

                                Counselor:
                                {" "}
                                {
                                  row.counselorRemarks
                                }

                              </small>

                            )}


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
                                This request can no longer be edited because it is {String(row.status).toLowerCase()}.
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


  const isCounselor =
    user.role ===
    "counselor";


  const isSuperAdmin =
    user.role ===
    "super_admin";


  const canSubmitReferral =
    [
      "teaching",
      "non_teaching",

      // Legacy compatibility while older user records are migrated.
      "faculty",
      "personnel"
    ].includes(
      user.role
    );


  const referralStatusOptions = [
    "Received",
    "Under review",
    "Contacted",
    "In progress",
    "Completed"
  ];


  const [
    referralStatusDrafts,
    setReferralStatusDrafts
  ] = useState({});


  const [
    referralRemarksDrafts,
    setReferralRemarksDrafts
  ] = useState({});


  const [
    savingReferralId,
    setSavingReferralId
  ] = useState("");


  const [
    referralUpdateMessage,
    setReferralUpdateMessage
  ] = useState("");


  const [
    referralUpdateError,
    setReferralUpdateError
  ] = useState("");


  const [
    submittingReferral,
    setSubmittingReferral
  ] = useState(false);


  const [
    referralSubmitMessage,
    setReferralSubmitMessage
  ] = useState("");


  const [
    referralSubmitError,
    setReferralSubmitError
  ] = useState("");


  const rows =
    useRows(
      "referrals",
      isSuperAdmin
        ? {}
        : isCounselor
          ? {
              assignedCounselorId:
                user.id
            }
          : {
              ownerId:
                user.id
            }
    );


  const counselorDirectory =
    useRows(
      "counselorDirectory",
      {
        active: true
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


  const referralsLoading =
    (
      isCounselor ||
      isSuperAdmin
    )
      ? rows.loading
      : rowsAreLoading(
          rows,
          counselorDirectory
        );


  const referralsError =
    (
      isCounselor ||
      isSuperAdmin
    )
      ? rows.error
      : firstRowsError(
          rows,
          counselorDirectory
        );


  async function submit(e) {

    e.preventDefault();


    if (
      isCounselor ||
      isSuperAdmin ||
      !canSubmitReferral
    ) {

      alert(
        "Only Teaching and Non-teaching users may submit referrals."
      );

      return;
    }


    setReferralSubmitMessage("");

    setReferralSubmitError("");


    if (
      !COLLEGE_OPTIONS.includes(
        form.department
      )
    ) {

      setReferralSubmitError(
        "Please select a valid college or office."
      );

      return;
    }


    const matchingCounselors =
      counselorDirectory.filter(
        counselor =>
          counselor.department ===
            form.department &&
          counselor.active ===
            true
      );


    if (
      matchingCounselors.length === 0
    ) {

      setReferralSubmitError(
        "No active Guidance Counselor is configured for the selected college/office."
      );

      return;
    }


    if (
      matchingCounselors.length > 1
    ) {

      setReferralSubmitError(
        "More than one active Guidance Counselor is configured for this college/office. Please contact the Super Admin before submitting the referral."
      );

      return;
    }


    const assignedCounselor =
      matchingCounselors[0];


    const confirmed =
      window.confirm(
        `Submit this referral?\n\nReferred person: ${form.personName}\nCollege / Office: ${form.department}\nAssigned counselor: ${assignedCounselor.name || "Guidance Counselor"}\n\nThe assigned counselor will receive the referral. You will be notified whenever the counselor changes its status.`
      );


    if (!confirmed) {
      return;
    }


    try {

      setSubmittingReferral(
        true
      );


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

          assignedCounselorId:
            assignedCounselor.counselorId ||
            assignedCounselor.id,

          assignedCounselorName:
            assignedCounselor.name ||
            "Guidance Counselor",

          assignedCounselorDepartment:
            assignedCounselor.department ||
            form.department,

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


      setReferralSubmitMessage(
        `Referral submitted successfully. ${assignedCounselor.name || "The assigned Guidance Counselor"} will review it. You will receive a notification whenever the referral status changes.`
      );


      setReferralSubmitError("");

    } catch (error) {

      console.error(
        "Unable to submit referral:",
        error
      );


      setReferralSubmitError(
        error?.code ===
          "permission-denied"

          ? "You do not have permission to submit this referral. Make sure you are signed in as a Teaching or Non-teaching user with a verified institutional email."

          : (
              error?.message ||
              "Unable to submit the referral."
            )
      );

    } finally {

      setSubmittingReferral(
        false
      );
    }
  }

  async function saveReferralUpdate(
    row
  ) {

    if (
      !isCounselor ||
      !row?.id
    ) {

      return;
    }


    const currentStatus =
      row.status ||
      "Received";


    const nextStatus =
      referralStatusDrafts[
        row.id
      ] ??
      currentStatus;


    const nextRemarks =
      String(
        referralRemarksDrafts[
          row.id
        ] ??
        row.counselorRemarks ??
        ""
      ).trim();


    if (
      !referralStatusOptions.includes(
        nextStatus
      )
    ) {

      alert(
        "Please select a valid referral status."
      );

      return;
    }


    const statusChanged =
      nextStatus !==
      currentStatus;


    const remarksChanged =
      nextRemarks !==
      String(
        row.counselorRemarks ||
        ""
      ).trim();


    if (
      !statusChanged &&
      !remarksChanged
    ) {

      setReferralUpdateMessage(
        "No referral changes to save."
      );

      setReferralUpdateError("");

      return;
    }


    try {

      setSavingReferralId(
        row.id
      );

      setReferralUpdateMessage("");

      setReferralUpdateError("");


      const batch =
        writeBatch(
          db
        );


      const referralRef =
        doc(
          db,
          "referrals",
          row.id
        );


      batch.update(
        referralRef,
        {
          status:
            nextStatus,

          counselorRemarks:
            nextRemarks,

          updatedById:
            user.id,

          updatedByName:
            user.name ||
            "Guidance Counselor",

          updatedAt:
            serverTimestamp()
        }
      );


      if (
        statusChanged &&
        row.referrerId
      ) {

        const notificationRef =
          doc(
            collection(
              db,
              "notifications"
            )
          );


        batch.set(
          notificationRef,
          {
            ownerId:
              row.referrerId,

            title:
              "Referral status updated",

            message:
              `The referral for ${row.personName || "the referred person"} is now "${nextStatus}".`,

            notificationType:
              "referral_status",

            senderRole:
              "counselor",

            senderId:
              user.id,

            senderName:
              user.name ||
              "Guidance Counselor",

            targetPath:
              "/referrals",

            sourceType:
              "referral",

            sourceId:
              row.id,

            referralStatus:
              nextStatus,

            read:
              false,

            createdAt:
              serverTimestamp()
          }
        );
      }


      await batch.commit();


      setReferralStatusDrafts(
        current => ({
          ...current,

          [row.id]:
            nextStatus
        })
      );


      setReferralRemarksDrafts(
        current => ({
          ...current,

          [row.id]:
            nextRemarks
        })
      );


      setReferralUpdateMessage(
        statusChanged
          ? "Referral status updated. The referrer was notified."
          : "Referral counselor remarks updated."
      );

    } catch (error) {

      console.error(
        "Unable to update referral:",
        error
      );


      setReferralUpdateError(
        error?.code ===
          "permission-denied"

          ? "You do not have permission to update this referral."

          : (
              error?.message ||
              "Unable to update the referral."
            )
      );

    } finally {

      setSavingReferralId(
        ""
      );
    }
  }


  if (referralsLoading) {

    return (
      <>
        <PageTitle
          title={
            isSuperAdmin
              ? "Referral Management"
              : isCounselor
                ? "Assigned Referrals"
                : "Referral"
          }
          subtitle={
            isSuperAdmin
              ? "Review referral records across all colleges and offices."
              : isCounselor
                ? "Referrals specifically assigned to you."
                : "Teaching and Non-teaching users may refer someone who may benefit from guidance support."
          }
        />

        <section className="panel">
          <Empty
            text="Loading referral information..."
          />
        </section>
      </>
    );
  }


  if (referralsError) {

    return (
      <>
        <PageTitle
          title={
            isSuperAdmin
              ? "Referral Management"
              : isCounselor
                ? "Assigned Referrals"
                : "Referral"
          }
          subtitle={
            isSuperAdmin
              ? "Review referral records across all colleges and offices."
              : isCounselor
                ? "Referrals specifically assigned to you."
                : "Teaching and Non-teaching users may refer someone who may benefit from guidance support."
          }
        />

        <div className="error-box">
          {referralsError}
        </div>
      </>
    );
  }


  if (isSuperAdmin) {

    return (
      <>

        <PageTitle
          title="Referral Management"
          subtitle="Review referral records across all colleges and offices."
        />


        <section className="panel">

          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              gap:
                "12px",

              flexWrap:
                "wrap",

              marginBottom:
                "16px"
            }}
          >

            <div>

              <h2
                style={{
                  marginBottom:
                    "4px"
                }}
              >
                All referrals
              </h2>

              <small>
                {
                  rows.length
                }
                {" "}
                referral
                {
                  rows.length ===
                  1
                    ? ""
                    : "s"
                }
                {" "}
                recorded
              </small>

            </div>

          </div>


          {
            rows.length ===
            0

              ? (

                <Empty
                  text="No referral records yet."
                />

              )

              : (

                <div className="record-list">

                  {
                    rows.map(
                      row => (

                        <article
                          className="record-card"
                          key={
                            row.id
                          }
                        >

                          <div
                            style={{
                              display:
                                "flex",

                              justifyContent:
                                "space-between",

                              gap:
                                "12px",

                              alignItems:
                                "flex-start",

                              flexWrap:
                                "wrap"
                            }}
                          >

                            <div>

                              <strong>
                                {
                                  row.personName ||
                                  "Referred user"
                                }
                              </strong>

                              <p>
                                {
                                  row.personType ||
                                  "User"
                                }
                                {" · "}
                                {
                                  row.department ||
                                  "No college / office"
                                }
                                {" · "}
                                {
                                  row.urgency ||
                                  "Routine"
                                }
                              </p>

                            </div>


                            <span className="status">
                              {
                                row.status ||
                                "Received"
                              }
                            </span>

                          </div>


                          {
                            row.reason &&
                            (

                              <p
                                style={{
                                  whiteSpace:
                                    "pre-wrap"
                                }}
                              >
                                <strong>
                                  Reason:
                                </strong>
                                {" "}
                                {
                                  row.reason
                                }
                              </p>

                            )
                          }


                          <p>
                            <strong>
                              Referred by:
                            </strong>
                            {" "}
                            {
                              row.referrerName ||
                              "Teaching / Non-teaching"
                            }
                          </p>


                          <p>
                            <strong>
                              Assigned counselor:
                            </strong>
                            {" "}
                            {
                              row.assignedCounselorName ||
                              "Not assigned"
                            }
                          </p>


                          {
                            row.contact &&
                            (

                              <p>
                                <strong>
                                  Contact:
                                </strong>
                                {" "}
                                {
                                  row.contact
                                }
                              </p>

                            )
                          }

                        </article>

                      )
                    )
                  }

                </div>

              )
          }

        </section>

      </>
    );
  }


  if (isCounselor) {

    return (
      <>

        <PageTitle
          title="Assigned Referrals"
          subtitle="View referrals that were routed to you through your counselor assignment."
        />


        <section className="panel">

          <h2>
            Referrals assigned to me
          </h2>


          {referralUpdateMessage && (

            <div
              className="success-box"
              style={{
                marginBottom:
                  "14px"
              }}
            >
              {referralUpdateMessage}
            </div>

          )}


          {referralUpdateError && (

            <div
              className="error-box"
              style={{
                marginBottom:
                  "14px"
              }}
            >
              {referralUpdateError}
            </div>

          )}


          {rows.length === 0

            ? (

              <Empty
                text="No referrals are currently assigned to you."
              />

            )

            : (

              <div className="record-list">

                {rows.map(
                  row => (

                    <article
                      className="record-card"
                      key={row.id}
                    >

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: "flex-start",
                          flexWrap: "wrap"
                        }}
                      >

                        <div>

                          <strong>
                            {row.personName || "Referred user"}
                          </strong>

                          <p>
                            {row.personType || "User"}
                            {" · "}
                            {row.department || "No college / office"}
                            {" · "}
                            {row.urgency || "Routine"}
                          </p>

                        </div>


                        <span className="status">
                          {row.status || "Received"}
                        </span>

                      </div>


                      {row.reason && (

                        <p
                          style={{
                            whiteSpace: "pre-wrap"
                          }}
                        >
                          <strong>
                            Reason:
                          </strong>
                          {" "}
                          {row.reason}
                        </p>

                      )}


                      {row.contact && (

                        <p>
                          <strong>
                            Contact:
                          </strong>
                          {" "}
                          {row.contact}
                        </p>

                      )}


                      <small>
                        Referred by:
                        {" "}
                        {row.referrerName || "Teaching / Non-teaching"}
                      </small>


                      <div
                        style={{
                          marginTop:
                            "16px",

                          paddingTop:
                            "14px",

                          borderTop:
                            "1px solid #e2e8f0"
                        }}
                      >

                        <label
                          style={{
                            marginBottom:
                              "10px"
                          }}
                        >
                          Referral status

                          <select
                            value={
                              referralStatusDrafts[
                                row.id
                              ] ??
                              row.status ??
                              "Received"
                            }
                            disabled={
                              savingReferralId ===
                              row.id
                            }
                            onChange={
                              event =>
                                setReferralStatusDrafts(
                                  current => ({
                                    ...current,

                                    [row.id]:
                                      event.target.value
                                  })
                                )
                            }
                          >

                            {referralStatusOptions.map(
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


                        <label
                          style={{
                            marginBottom:
                              "10px"
                          }}
                        >
                          Counselor remarks
                          <span
                            className="optional-text"
                            style={{
                              display:
                                "block",

                              marginBottom:
                                "6px"
                            }}
                          >
                            Internal referral documentation. The referrer is
                            notified only when the status changes.
                          </span>

                          <textarea
                            rows="3"
                            value={
                              referralRemarksDrafts[
                                row.id
                              ] ??
                              row.counselorRemarks ??
                              ""
                            }
                            disabled={
                              savingReferralId ===
                              row.id
                            }
                            onChange={
                              event =>
                                setReferralRemarksDrafts(
                                  current => ({
                                    ...current,

                                    [row.id]:
                                      event.target.value
                                  })
                                )
                            }
                            placeholder="Add referral review notes."
                          />

                        </label>


                        <button
                          type="button"
                          className="primary-button"
                          disabled={
                            savingReferralId ===
                            row.id
                          }
                          onClick={
                            () =>
                              saveReferralUpdate(
                                row
                              )
                          }
                        >
                          {
                            savingReferralId ===
                              row.id
                              ? "Saving..."
                              : "Save referral update"
                          }
                        </button>

                      </div>

                    </article>

                  )
                )}

              </div>

            )
          }

        </section>

      </>
    );
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

        subtitle="Teaching and Non-teaching users may refer someone who may benefit from guidance support."

      />


      {referralSubmitMessage && (

        <div
          className="success-box"
          style={{
            marginBottom:
              "16px"
          }}
        >
          {referralSubmitMessage}
        </div>

      )}


      {referralSubmitError && (

        <div
          className="error-box"
          style={{
            marginBottom:
              "16px"
          }}
        >
          {referralSubmitError}
        </div>

      )}


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


              {COLLEGE_OPTIONS.map(
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


          <label>

            Contact information

            <input

              value={
                form.contact
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    contact:
                      e.target.value
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


          <button
            className="primary-button"
            disabled={
              submittingReferral ||
              !canSubmitReferral
            }
          >

            {
              submittingReferral
                ? "Submitting referral..."
                : "Submit referral"
            }

          </button>

        </form>


        <section className="panel">

          <h2>
            Referral status
          </h2>


          <p
            style={{
              marginTop:
                "-4px",

              color:
                "#667085"
            }}
          >
            MindTrack will notify you whenever the assigned counselor changes
            the status of a referral you submitted.
          </p>


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


                    {row.updatedByName && (

                      <small
                        style={{
                          display:
                            "block",

                          marginTop:
                            "6px"
                        }}
                      >
                        Last updated by:
                        {" "}
                        {
                          row.updatedByName
                        }
                      </small>

                    )}

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


  const allowedRoles =
    GENERAL_USER_ROLE_VALUES;


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

  const [historyError, setHistoryError] =
    useState("");


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
            setHistoryError("");
            setHistoryLoading(false);

          },

          err => {

            console.error(
              "Unable to load feedback history:",
              err
            );

            setHistoryError(
              err?.code ===
              "permission-denied"
                ? "You do not have permission to load your feedback history."
                : (
                    err?.message ||
                    "Unable to load your feedback history."
                  )
            );

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

            : historyError

              ? (

                <div className="error-box">
                  {historyError}
                </div>

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

  const allowedRoles =
    GENERAL_USER_ROLE_VALUES;

  const [form, setForm] =
    useState({
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
              systemRoleLabel(
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
                  systemRoleLabel(
                    user.role
                  )
                }
                readOnly
              />
            </label>


            <label>
              College / Office

              <input
                value={
                  user.department ||
                  ""
                }
                readOnly
              />
            </label>


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


  useEffect(
    () => {

      if (isSuperAdmin) {

        const unsubscribe =
          onSnapshot(
            collection(
              db,
              "counselingProfiles"
            ),
            snapshot => {

              const map = {};

              snapshot.docs.forEach(
                item => {
                  map[item.id] =
                    item.data();
                }
              );

              setProfileTransferMap(map);
            },
            () =>
              setProfileTransferMap({})
          );

        return unsubscribe;
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


      const unsubscribe =
        onSnapshot(
          accessQuery,
          async snapshot => {

            try {

              const rows =
                await Promise.all(
                  snapshot.docs.map(
                    async accessDoc => {

                      const access =
                        accessDoc.data();

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
          }
        );

      return unsubscribe;

    },
    [
      isSuperAdmin,
      currentUser.id
    ]
  );


  const combinedRows =
    isSuperAdmin
      ? departmentRows
      : mergeRowsById(
          departmentRows,
          transferredRows
        );


  useEffect(
    () => {

      if (
        isSuperAdmin
      ) {
        return undefined;
      }


      let cancelled =
        false;


      async function loadTransferProfileState() {

        try {

          const ids =
            Array.from(
              new Set(
                combinedRows
                  .map(
                    account =>
                      account.id
                  )
                  .filter(Boolean)
              )
            );


          const entries =
            await Promise.all(
              ids.map(
                async ownerId => {

                  try {

                    const snapshot =
                      await getDoc(
                        doc(
                          db,
                          "counselingProfiles",
                          ownerId
                        )
                      );


                    return [
                      ownerId,
                      snapshot.exists()
                        ? snapshot.data()
                        : null
                    ];

                  } catch (error) {

                    if (
                      error?.code !==
                      "permission-denied"
                    ) {

                      console.error(
                        "Unable to load counseling profile transfer state:",
                        error
                      );
                    }


                    return [
                      ownerId,
                      null
                    ];
                  }
                }
              )
            );


          if (!cancelled) {

            setProfileTransferMap(
              Object.fromEntries(
                entries.filter(
                  ([, value]) =>
                    Boolean(value)
                )
              )
            );
          }

        } catch (error) {

          console.error(
            "Unable to load transfer profile states:",
            error
          );


          if (!cancelled) {
            setProfileTransferMap({});
          }
        }
      }


      loadTransferProfileState();


      return () => {
        cancelled =
          true;
      };

    },
    [
      isSuperAdmin,
      currentUser.id,
      departmentRows,
      transferredRows
    ]
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

    const transferProfile =
      profileTransferMap[
        account.id
      ];


    return Boolean(
      account._transferredAccess ||
      transferProfile
        ?.transferActive ||
      transferProfile
        ?.transferRequestId ||
      (
        Array.isArray(
          transferProfile
            ?.previousCounselorIds
        ) &&
        transferProfile.previousCounselorIds.length >
          0
      )
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

    return systemRoleLabel(
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
          User profile information is read-only. The assigned counselor may manage Counselor Notes. Approved transferred users remain accessible to the accepting counselor through transfer access.
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


  if (allRows.loading) {

    return (
      <>
        <PageTitle
          title="Notifications"
          subtitle="Updates from your MindTrack activity."
        />

        <section
          className="panel"
          style={{
            width: "100%",
            maxWidth: "950px",
            boxSizing: "border-box",
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >
          <Empty
            text="Loading notifications..."
          />
        </section>
      </>
    );
  }


  if (allRows.error) {

    return (
      <>
        <PageTitle
          title="Notifications"
          subtitle="Updates from your MindTrack activity."
        />

        <div
          className="error-box"
          style={{
            width: "100%",
            maxWidth: "950px",
            boxSizing: "border-box",
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >
          {allRows.error}
        </div>
      </>
    );
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


      <section
        className="panel notification-panel"
        style={{
          width: "100%",
          maxWidth: "950px",
          boxSizing: "border-box",
          marginLeft: "auto",
          marginRight: "auto"
        }}
      >

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


  if (assessments.loading) {

    return (
      <>
        <PageTitle
          title="Mental Health Monitoring"
          subtitle="Your current monitoring state and trend are based only on assessments reviewed by a Guidance Counselor."
        />

        <section className="panel">
          <Empty
            text="Loading monitoring data..."
          />
        </section>
      </>
    );
  }


  if (assessments.error) {

    return (
      <>
        <PageTitle
          title="Mental Health Monitoring"
          subtitle="Your current monitoring state and trend are based only on assessments reviewed by a Guidance Counselor."
        />

        <div className="error-box">
          {assessments.error}
        </div>
      </>
    );
  }


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


  const historyLoading =
    rowsAreLoading(
      assessments,
      consultations
    );


  const historyError =
    firstRowsError(
      assessments,
      consultations
    );


  if (historyLoading) {

    return (
      <>
        <PageTitle
          title="History"
          subtitle="Your own assessment and counseling request records."
        />

        <section className="panel">
          <Empty
            text="Loading history..."
          />
        </section>
      </>
    );
  }


  if (historyError) {

    return (
      <>
        <PageTitle
          title="History"
          subtitle="Your own assessment and counseling request records."
        />

        <div className="error-box">
          {historyError}
        </div>
      </>
    );
  }


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


  const [
    transferredAssessmentRows,
    setTransferredAssessmentRows
  ] = useState([]);


  const [
    transferredAssessmentsLoading,
    setTransferredAssessmentsLoading
  ] = useState(
    !isSuperAdmin
  );


  const [
    transferredAssessmentsError,
    setTransferredAssessmentsError
  ] = useState("");


  useEffect(
    () => {

      if (
        isSuperAdmin
      ) {

        setTransferredAssessmentRows([]);
        setTransferredAssessmentsLoading(false);
        setTransferredAssessmentsError("");

        return undefined;
      }


      setTransferredAssessmentsLoading(
        true
      );

      setTransferredAssessmentsError(
        ""
      );


      let assessmentUnsubscribers = [];


      const accessQuery =
        query(
          collection(
            db,
            "transferAccess"
          ),
          where(
            "counselorId",
            "==",
            user.id
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

          snapshot => {

            assessmentUnsubscribers.forEach(
              unsubscribe =>
                unsubscribe()
            );

            assessmentUnsubscribers = [];


            const ownerIds =
              Array.from(
                new Set(
                  snapshot.docs
                    .map(
                      item =>
                        item.data()
                          .ownerId
                    )
                    .filter(Boolean)
                )
              );


            if (
              ownerIds.length ===
              0
            ) {

              setTransferredAssessmentRows([]);
              setTransferredAssessmentsLoading(false);

              return;
            }


            const rowsByOwner =
              new Map();


            ownerIds.forEach(
              ownerId => {

                const ownerAssessmentQuery =
                  query(
                    collection(
                      db,
                      "assessments"
                    ),
                    where(
                      "ownerId",
                      "==",
                      ownerId
                    )
                  );


                const unsubscribe =
                  onSnapshot(
                    ownerAssessmentQuery,

                    ownerSnapshot => {

                      rowsByOwner.set(
                        ownerId,
                        ownerSnapshot.docs.map(
                          item => ({
                            id:
                              item.id,

                            ...item.data()
                          })
                        )
                      );


                      setTransferredAssessmentRows(
                        Array.from(
                          rowsByOwner.values()
                        ).flat()
                      );


                      setTransferredAssessmentsLoading(
                        rowsByOwner.size <
                          ownerIds.length
                      );
                    },

                    error => {

                      console.error(
                        "Unable to load transferred assessment cases:",
                        error
                      );


                      setTransferredAssessmentsError(
                        error?.message ||
                        "Unable to load transferred assessment cases."
                      );

                      setTransferredAssessmentsLoading(
                        false
                      );
                    }
                  );


                assessmentUnsubscribers.push(
                  unsubscribe
                );
              }
            );
          },

          error => {

            console.error(
              "Unable to load transfer access for assessment cases:",
              error
            );


            setTransferredAssessmentRows([]);

            setTransferredAssessmentsError(
              error?.message ||
              "Unable to load transferred assessment access."
            );

            setTransferredAssessmentsLoading(
              false
            );
          }
        );


      return () => {

        accessUnsubscribe();

        assessmentUnsubscribers.forEach(
          unsubscribe =>
            unsubscribe()
        );
      };

    },
    [
      isSuperAdmin,
      user.id
    ]
  );


  const rows =
    isSuperAdmin
      ? departmentAssessmentRows
      : mergeRowsById(
          departmentAssessmentRows,
          transferredAssessmentRows
        );


  const casesLoading =
    departmentAssessmentRows.loading ||
    transferredAssessmentsLoading;


  const casesError =
    departmentAssessmentRows.error ||
    transferredAssessmentsError;


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


  const [
    deletingAssessmentId,
    setDeletingAssessmentId
  ] = useState("");


  const assessmentStatuses = [
    "For review",
    "Counseling is recommended",
    "Follow up is recommended",
    "Counseling is optional",
    "Approved",
    "Concluded"
  ];


  function allowedAssessmentStatuses(
    currentStatus
  ) {
    if (currentStatus === "Concluded") {
      return ["Concluded"];
    }

    if (currentStatus === "Approved") {
      return ["Approved", "Concluded"];
    }

    return assessmentStatuses;
  }


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


  async function deleteSelectedAssessmentRecord() {

    if (
      !isSuperAdmin ||
      !selected?.id ||
      !selected?.ownerId
    ) {

      return;
    }


    if (
      !superAdminDeleteConfirmed(
        "psychological assessment",
        selected.ownerName
      )
    ) {

      return;
    }


    try {

      setDeletingAssessmentId(
        selected.id
      );


      const ownerAssessmentsSnapshot =
        await getDocs(
          query(
            collection(
              db,
              "assessments"
            ),
            where(
              "ownerId",
              "==",
              selected.ownerId
            )
          )
        );


      const remainingAssessments =
        ownerAssessmentsSnapshot.docs
          .filter(
            item =>
              item.id !==
              selected.id
          )
          .map(
            item => ({
              id:
                item.id,

              ...item.data()
            })
          )
          .sort(
            newestRecordFirst
          );


      const activeAssessment =
        remainingAssessments.find(
          row =>
            row.status !==
            "Concluded"
        ) ||
        null;


      const nextAssessment =
        activeAssessment ||
        remainingAssessments[0] ||
        null;


      const notificationSnapshot =
        await getDocs(
          query(
            collection(
              db,
              "notifications"
            ),
            where(
              "sourceId",
              "==",
              selected.id
            )
          )
        );


      const currentLockSnapshot =
        await getDoc(
          doc(
            db,
            "assessmentLocks",
            selected.ownerId
          )
        );


      const lockRef =
        doc(
          db,
          "assessmentLocks",
          selected.ownerId
        );


      const batch =
        writeBatch(
          db
        );


      batch.delete(
        doc(
          db,
          "assessments",
          selected.id
        )
      );


      notificationSnapshot.docs.forEach(
        item =>
          batch.delete(
            item.ref
          )
      );


      if (
        nextAssessment
      ) {

        const currentLock =
          currentLockSnapshot.exists()
            ? currentLockSnapshot.data()
            : {};


        const nextStatus =
          nextAssessment.status ||
          "For review";


        const nextConcludedAt =
          nextStatus ===
            "Concluded"

            ? (
                (
                  currentLock.latestAssessmentId ===
                    nextAssessment.id &&
                  currentLock.concludedAt
                )
                  ? currentLock.concludedAt
                  : (
                      nextAssessment.concludedAt ||
                      nextAssessment.updatedAt ||
                      nextAssessment.createdAt ||
                      serverTimestamp()
                    )
              )

            : null;


        batch.set(
          lockRef,
          {
            ownerId:
              selected.ownerId,

            department:
              nextAssessment.department ||
              selected.department ||
              "",

            latestAssessmentId:
              nextAssessment.id,

            status:
              nextStatus,

            concludedAt:
              nextConcludedAt,

            earlyReassessmentAllowed:
              false,

            updatedAt:
              serverTimestamp()
          },
          {
            merge:
              false
          }
        );

      } else {

        batch.set(
          lockRef,
          {
            ownerId:
              selected.ownerId,

            department:
              selected.department ||
              "",

            latestAssessmentId:
              "",

            status:
              "Eligible",

            concludedAt:
              null,

            earlyReassessmentAllowed:
              false,

            updatedAt:
              serverTimestamp()
          },
          {
            merge:
              false
          }
        );
      }


      await batch.commit();


      closeAssessmentReview();


      alert(
        "Assessment cleanup completed. The assessment, related notifications, and assessment lock were repaired."
      );

    } catch (error) {

      console.error(
        "Unable to permanently clean up the assessment:",
        error
      );


      alert(
        error?.message ||
        "Unable to delete the assessment safely."
      );

    } finally {

      setDeletingAssessmentId(
        ""
      );
    }
  }


  async function saveAssessmentUpdate() {

    if (!selected) {
      return;
    }


    if (
      !allowedAssessmentStatuses(
        selected.status
      ).includes(statusDraft)
    ) {
      alert(
        "This assessment status transition is not allowed."
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


      const assessmentRef =
        doc(
          db,
          "assessments",
          selected.id
        );


      const lockRef =
        doc(
          db,
          "assessmentLocks",
          selected.ownerId
        );


      await runTransaction(
        db,

        async transaction => {

          const assessmentSnapshot =
            await transaction.get(
              assessmentRef
            );


          const lockSnapshot =
            await transaction.get(
              lockRef
            );


          if (!assessmentSnapshot.exists()) {

            throw new Error(
              "The selected psychological assessment no longer exists."
            );
          }


          if (!lockSnapshot.exists()) {

            throw new Error(
              "This user's assessment eligibility record is missing. Run the assessment-lock migration first."
            );
          }


          const storedAssessment =
            assessmentSnapshot.data();


          const storedLock =
            lockSnapshot.data();


          transaction.update(
            assessmentRef,
            {
              ...assessmentUpdate,

              updatedAt:
                serverTimestamp()
            }
          );


          const statusChanged =
            storedAssessment.status !==
            statusDraft;


          if (
            statusChanged &&
            storedLock.latestAssessmentId ===
              selected.id
          ) {

            transaction.update(
              lockRef,
              {
                status:
                  statusDraft,

                concludedAt:
                  statusDraft ===
                    "Concluded"
                    ? serverTimestamp()
                    : null,

                earlyReassessmentAllowed:
                  false,

                updatedAt:
                  serverTimestamp()
              }
            );
          }
        }
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


  if (casesLoading) {

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

        <section className="panel">
          <Empty
            text="Loading assessment cases..."
          />
        </section>
      </>
    );
  }


  if (casesError) {

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

        <div className="error-box">
          {casesError}
        </div>
      </>
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


                <label>

                  Status

                  <select

                    value={
                      statusDraft
                    }

                    onChange={
                      event =>
                        setStatusDraft(
                          event.target.value
                        )
                    }

                  >

                    {allowedAssessmentStatuses(
                      selected.status
                    ).map(
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

                    onChange={
                      event =>
                        setRemarksDraft(
                          event.target.value
                        )
                    }

                    placeholder="Add remarks, recommendations, or instructions."

                  />

                </label>


                {selected.status ===
                  "Concluded" && (

                  <div className="notice">

                    <strong>
                      Mandatory 14-day reassessment cooldown
                    </strong>

                    <p>
                      This assessment is concluded. MindTrack requires the user
                      to complete the full 14-day reassessment period before a
                      new psychological assessment can be submitted.
                    </p>

                    <p
                      style={{
                        marginBottom: 0
                      }}
                    >
                      The cooldown cannot be bypassed by a counselor or
                      Super Admin.
                    </p>

                  </div>

                )}


                {isSuperAdmin && (

                  <div className="superadmin-cleanup-zone">

                    <div>

                      <strong>
                        Super Admin test-data cleanup
                      </strong>

                      <p>
                        Permanently delete only an erroneous or test assessment.
                        MindTrack will also repair the user's assessment lock.
                      </p>

                    </div>


                    <button
                      type="button"
                      className="danger-button superadmin-cleanup-delete-button"
                      title="Delete assessment"
                      disabled={
                        deletingAssessmentId ===
                        selected.id
                      }
                      onClick={
                        deleteSelectedAssessmentRecord
                      }
                    >
                      {
                        deletingAssessmentId ===
                          selected.id
                          ? "Deleting assessment..."
                          : "Delete"
                      }
                    </button>

                  </div>

                )}


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
                      savingCase
                    }

                    onClick={
                      saveAssessmentUpdate
                    }

                  >

                    {
                      savingCase
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


  // A counseling request that is already assigned to another
  // counselor remains viewable for record continuity, but the
  // former counselor must not be able to change it.
  function requestIsReadOnly(
    row
  ) {

    return Boolean(
      user.role ===
        "counselor" &&
      row?.assignedCounselorId &&
      row.assignedCounselorId !==
        user.id
    );
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


  const rows =
    useMemo(
      () =>
        isSuperAdmin
          ? departmentConsultations
          : mergeRowsById(
              departmentConsultations,
              assignedConsultations
            ),
      [
        isSuperAdmin,
        departmentConsultations,
        assignedConsultations
      ]
    );


  const assessmentRows =
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
      "transferRequests",
      isSuperAdmin
        ? {}
        : {
            requestedById:
              user.id
          }
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
    privateCaseHistoryDraft,
    setPrivateCaseHistoryDraft
  ] = useState("");


  const [
    privateSessionSummaryDraft,
    setPrivateSessionSummaryDraft
  ] = useState("");


  const [
    privateObservationDraft,
    setPrivateObservationDraft
  ] = useState("");


  const [
    privateRecommendedActionsDraft,
    setPrivateRecommendedActionsDraft
  ] = useState("");


  const [
    privateNotesLoading,
    setPrivateNotesLoading
  ] = useState(false);


  const [
    privateNotesSaving,
    setPrivateNotesSaving
  ] = useState(false);


  const [
    privateNotesMessage,
    setPrivateNotesMessage
  ] = useState("");


  const [
    privateNotesError,
    setPrivateNotesError
  ] = useState("");


  const [
    privateNotesExists,
    setPrivateNotesExists
  ] = useState(false);


  const [
    privateNotesUpdatedBy,
    setPrivateNotesUpdatedBy
  ] = useState("");


  const [
    privateNotesLoadedFromLegacyProfile,
    setPrivateNotesLoadedFromLegacyProfile
  ] = useState(false);


  const [
    saving,
    setSaving
  ] = useState(false);


  const [
    deletingCounselingId,
    setDeletingCounselingId
  ] = useState("");


  const [
    deletingTransferId,
    setDeletingTransferId
  ] = useState("");


  // Keep modal navigation metadata in refs rather than state.
  // This prevents the Schedule -> Counseling Requests flow from
  // creating a render loop while the request modal is opening.
  const reviewReturnPathRef =
    useRef("");


  const handledRequestNavigationRef =
    useRef("");


  function closeRequestReview() {

    const destination =
      reviewReturnPathRef.current;


    reviewReturnPathRef.current =
      "";


    handledRequestNavigationRef.current =
      "";


    setSelected(null);

    setStatusDraft("");

    setRemarksDraft("");

    setPrivateCaseHistoryDraft("");

    setPrivateSessionSummaryDraft("");

    setPrivateObservationDraft("");

    setPrivateRecommendedActionsDraft("");

    setPrivateNotesMessage("");

    setPrivateNotesError("");

    setPrivateNotesExists(false);

    setPrivateNotesUpdatedBy("");

    setPrivateNotesLoadedFromLegacyProfile(false);


    if (destination) {

      navigate(
        destination,
        {
          replace: true
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

      if (
        !selected?.id ||
        !selected?.ownerId
      ) {

        setPrivateNotesLoading(
          false
        );

        setPrivateNotesUpdatedBy("");

        setPrivateNotesLoadedFromLegacyProfile(
          false
        );

        return undefined;
      }


      setPrivateNotesLoading(
        true
      );

      setPrivateNotesMessage("");

      setPrivateNotesError("");

      setPrivateNotesUpdatedBy("");

      setPrivateNotesLoadedFromLegacyProfile(
        false
      );


      let cancelled =
        false;


      const noteRef =
        doc(
          db,
          "counselingSessionNotes",
          selected.id
        );


      async function loadLegacyCounselingProfileNotes() {

        try {

          const profileSnapshot =
            await getDoc(
              doc(
                db,
                "counselingProfiles",
                selected.ownerId
              )
            );


          if (
            cancelled
          ) {

            return;
          }


          if (
            !profileSnapshot.exists()
          ) {

            setPrivateCaseHistoryDraft("");

            setPrivateSessionSummaryDraft("");

            setPrivateObservationDraft("");

            setPrivateRecommendedActionsDraft("");

            setPrivateNotesUpdatedBy("");

            setPrivateNotesLoadedFromLegacyProfile(
              false
            );

            setPrivateNotesLoading(
              false
            );

            return;
          }


          const legacy =
            profileSnapshot.data();


          const hasLegacyNotes =
            Boolean(
              String(
                legacy.caseHistory ||
                ""
              ).trim() ||
              String(
                legacy.counselingSessionSummary ||
                ""
              ).trim() ||
              String(
                legacy.counselorObservation ||
                ""
              ).trim() ||
              String(
                legacy.recommendations ||
                legacy.notes ||
                ""
              ).trim()
            );


          setPrivateCaseHistoryDraft(
            legacy.caseHistory ||
            ""
          );


          setPrivateSessionSummaryDraft(
            legacy.counselingSessionSummary ||
            ""
          );


          setPrivateObservationDraft(
            legacy.counselorObservation ||
            ""
          );


          setPrivateRecommendedActionsDraft(
            legacy.recommendations ||
            legacy.notes ||
            ""
          );


          setPrivateNotesUpdatedBy(
            legacy.updatedByName ||
            legacy.assignedCounselorName ||
            ""
          );


          setPrivateNotesLoadedFromLegacyProfile(
            hasLegacyNotes
          );


          setPrivateNotesLoading(
            false
          );

        } catch (error) {

          if (
            cancelled
          ) {

            return;
          }


          console.error(
            "Unable to load legacy counseling profile notes:",
            error
          );


          setPrivateNotesError(
            error?.code ===
              "permission-denied"

              ? "You do not have permission to view the private counseling notes for this request."

              : (
                  error?.message ||
                  "Unable to load private counseling notes."
                )
          );


          setPrivateNotesLoading(
            false
          );
        }
      }


      const unsubscribe =
        onSnapshot(
          noteRef,

          snapshot => {

            if (
              cancelled
            ) {

              return;
            }


            if (
              !snapshot.exists()
            ) {

              setPrivateNotesExists(
                false
              );


              loadLegacyCounselingProfileNotes();

              return;
            }


            const data =
              snapshot.data();


            setPrivateNotesExists(
              true
            );


            setPrivateCaseHistoryDraft(
              data.caseHistory ||
              ""
            );


            setPrivateSessionSummaryDraft(
              data.counselingSessionSummary ||
              ""
            );


            setPrivateObservationDraft(
              data.counselorObservation ||
              ""
            );


            setPrivateRecommendedActionsDraft(
              data.recommendedActions ||
              ""
            );


            setPrivateNotesUpdatedBy(
              data.updatedByName ||
              data.assignedCounselorName ||
              ""
            );


            setPrivateNotesLoadedFromLegacyProfile(
              false
            );


            setPrivateNotesLoading(
              false
            );
          },

          error => {

            if (
              cancelled
            ) {

              return;
            }


            console.error(
              "Unable to load private counseling session notes:",
              error
            );


            setPrivateNotesError(
              error?.code ===
                "permission-denied"

                ? "You do not have permission to view the private counseling notes for this request."

                : (
                    error?.message ||
                    "Unable to load private counseling notes."
                  )
            );


            setPrivateNotesLoading(
              false
            );
          }
        );


      return () => {

        cancelled =
          true;

        unsubscribe();
      };

    },
    [
      selected?.id,
      selected?.ownerId
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


      const allowedReviewStatuses = [
        "For review",
        "Schedule for counseling",
        "Follow up is recommended",
        "Counseling is optional",
        "For referral",
        "Concluded"
      ];


      // Consume the route state before opening the modal so
      // closing the modal cannot re-trigger the same request.
      navigate(
        location.pathname,
        {
          replace: true,
          state: null
        }
      );


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

    },

    [
      requestedRequestId,
      requestedFromSchedule,
      requestedNavigationKey,
      enrichedRows,
      navigate,
      location.pathname
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

    setSelected(row);

    const allowedReviewStatuses = [
      "For review",
      "Schedule for counseling",
      "Follow up is recommended",
      "Counseling is optional",
      "For referral",
      "Concluded"
    ];


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


  function transferRequestsForConsultation(
    consultationId
  ) {

    return transferRequests.filter(
      row =>
        row.consultationId ===
        consultationId
    );
  }


  function approvedTransferForConsultation(
    consultationId
  ) {

    return transferRequestsForConsultation(
      consultationId
    ).find(
      row =>
        row.status ===
          "Approved"
    ) ||
    null;
  }


  function canRequestTransfer(row) {

    if (
      user.role !== "counselor" ||
      row.status !==
        "Schedule for counseling" ||
      !row.date ||
      !row.time ||
      appointmentHasStarted(row) ||
      transferRequestForConsultation(
        row.id
      )
    ) {
      return false;
    }


    return (
      !row.assignedCounselorId ||
      row.assignedCounselorId ===
        user.id
    );
  }


  async function deletePendingTransferRecord(
    transfer
  ) {

    if (
      !isSuperAdmin ||
      !transfer?.id
    ) {

      return;
    }


    if (
      transfer.status !==
      "Pending approval"
    ) {

      alert(
        "Only a pending transfer request can be deleted directly. Approved transfer history is protected because it controls counselor access and assignment documentation."
      );

      return;
    }


    if (
      !superAdminDeleteConfirmed(
        "pending counselor transfer request",
        transfer.ownerName ||
        selected?.ownerName
      )
    ) {

      return;
    }


    try {

      setDeletingTransferId(
        transfer.id
      );


      const [
        sourceNotificationsSnapshot,
        linkedNotificationsSnapshot,
        transferAccessSnapshot
      ] =
        await Promise.all([
          getDocs(
            query(
              collection(
                db,
                "notifications"
              ),
              where(
                "sourceId",
                "==",
                transfer.id
              )
            )
          ),

          getDocs(
            query(
              collection(
                db,
                "notifications"
              ),
              where(
                "transferRequestId",
                "==",
                transfer.id
              )
            )
          ),

          getDocs(
            query(
              collection(
                db,
                "transferAccess"
              ),
              where(
                "transferRequestId",
                "==",
                transfer.id
              )
            )
          )
        ]);


      const consultationRef =
        doc(
          db,
          "consultations",
          transfer.consultationId
        );


      const consultationSnapshot =
        await getDoc(
          consultationRef
        );


      const batch =
        writeBatch(
          db
        );


      batch.delete(
        doc(
          db,
          "transferRequests",
          transfer.id
        )
      );


      uniqueDocumentReferences([
        ...sourceNotificationsSnapshot.docs.map(
          item =>
            item.ref
        ),
        ...linkedNotificationsSnapshot.docs.map(
          item =>
            item.ref
        ),
        ...transferAccessSnapshot.docs.map(
          item =>
            item.ref
        )
      ]).forEach(
        reference =>
          batch.delete(
            reference
          )
      );


      if (
        consultationSnapshot.exists()
      ) {

        const consultation =
          consultationSnapshot.data();


        if (
          consultation.transferRequestId ===
            transfer.id
        ) {

          batch.update(
            consultationRef,
            {
              transferStatus:
                "",

              transferRequestId:
                "",

              updatedAt:
                serverTimestamp()
            }
          );
        }
      }


      await batch.commit();


      setSelected(
        current =>
          current &&
          current.id ===
            transfer.consultationId
            ? {
                ...current,
                transferStatus:
                  "",
                transferRequestId:
                  ""
              }
            : current
      );


      alert(
        "Pending transfer cleanup completed. The transfer request, linked notifications, and temporary transfer metadata were removed."
      );

    } catch (error) {

      console.error(
        "Unable to clean up pending transfer request:",
        error
      );


      alert(
        error?.message ||
        "Unable to delete the pending transfer request safely."
      );

    } finally {

      setDeletingTransferId(
        ""
      );
    }
  }


  async function deleteSelectedCounselingRequest() {

    if (
      !isSuperAdmin ||
      !selected?.id ||
      !selected?.ownerId
    ) {

      return;
    }


    const linkedTransfers =
      transferRequestsForConsultation(
        selected.id
      );


    const approvedTransfer =
      linkedTransfers.find(
        row =>
          row.status ===
          "Approved"
      );


    if (
      approvedTransfer
    ) {

      alert(
        "This counseling request has an approved counselor transfer. Permanent deletion is blocked because removing it would break counselor assignment/history. Keep the approved record for documentation, or clean the whole test account with an Admin SDK cleanup script."
      );

      return;
    }


    if (
      !superAdminDeleteConfirmed(
        "counseling request",
        selected.ownerName
      )
    ) {

      return;
    }


    try {

      setDeletingCounselingId(
        selected.id
      );


      const [
        ownerConsultationsSnapshot,
        slotSnapshot,
        consultationNotificationsSnapshot
      ] =
        await Promise.all([
          getDocs(
            query(
              collection(
                db,
                "consultations"
              ),
              where(
                "ownerId",
                "==",
                selected.ownerId
              )
            )
          ),

          getDocs(
            query(
              collection(
                db,
                "counselingScheduleSlots"
              ),
              where(
                "consultationId",
                "==",
                selected.id
              )
            )
          ),

          getDocs(
            query(
              collection(
                db,
                "notifications"
              ),
              where(
                "sourceId",
                "==",
                selected.id
              )
            )
          )
        ]);


      const remainingConsultations =
        ownerConsultationsSnapshot.docs
          .filter(
            item =>
              item.id !==
              selected.id
          )
          .map(
            item => ({
              id:
                item.id,

              ...item.data()
            })
          )
          .sort(
            newestRecordFirst
          );


      const activeConsultation =
        remainingConsultations.find(
          row =>
            counselingRequestIsActive(
              row.status
            )
        ) ||
        null;


      const nextConsultation =
        activeConsultation ||
        remainingConsultations[0] ||
        null;


      const relatedReferences = [
        ...slotSnapshot.docs.map(
          item =>
            item.ref
        ),
        ...consultationNotificationsSnapshot.docs.map(
          item =>
            item.ref
        )
      ];


      for (
        const transfer of
        linkedTransfers
      ) {

        const [
          sourceNotificationsSnapshot,
          linkedNotificationsSnapshot,
          accessSnapshot
        ] =
          await Promise.all([
            getDocs(
              query(
                collection(
                  db,
                  "notifications"
                ),
                where(
                  "sourceId",
                  "==",
                  transfer.id
                )
              )
            ),

            getDocs(
              query(
                collection(
                  db,
                  "notifications"
                ),
                where(
                  "transferRequestId",
                  "==",
                  transfer.id
                )
              )
            ),

            getDocs(
              query(
                collection(
                  db,
                  "transferAccess"
                ),
                where(
                  "transferRequestId",
                  "==",
                  transfer.id
                )
              )
            )
          ]);


        relatedReferences.push(
          doc(
            db,
            "transferRequests",
            transfer.id
          ),

          ...sourceNotificationsSnapshot.docs.map(
            item =>
              item.ref
          ),

          ...linkedNotificationsSnapshot.docs.map(
            item =>
              item.ref
          ),

          ...accessSnapshot.docs.map(
            item =>
              item.ref
          )
        );
      }


      const batch =
        writeBatch(
          db
        );


      batch.delete(
        doc(
          db,
          "consultations",
          selected.id
        )
      );


      batch.delete(
        doc(
          db,
          "counselingSessionNotes",
          selected.id
        )
      );


      uniqueDocumentReferences(
        relatedReferences
      ).forEach(
        reference =>
          batch.delete(
            reference
          )
      );


      const lockRef =
        doc(
          db,
          "counselingRequestLocks",
          selected.ownerId
        );


      if (
        nextConsultation
      ) {

        batch.set(
          lockRef,
          {
            ownerId:
              selected.ownerId,

            department:
              nextConsultation.department ||
              selected.department ||
              "",

            latestConsultationId:
              nextConsultation.id,

            status:
              nextConsultation.status ===
                "Canceled"
                ? "Cancelled"
                : (
                    nextConsultation.status ||
                    "Pending approval"
                  ),

            updatedAt:
              serverTimestamp()
          },
          {
            merge:
              false
          }
        );

      } else {

        batch.set(
          lockRef,
          {
            ownerId:
              selected.ownerId,

            department:
              selected.department ||
              "",

            latestConsultationId:
              "",

            status:
              "Eligible",

            updatedAt:
              serverTimestamp()
          },
          {
            merge:
              false
          }
        );
      }


      await batch.commit();


      closeRequestReview();


      alert(
        "Counseling-request cleanup completed. The request, private session note, slot, pending transfer data, notifications, and counseling lock were repaired."
      );

    } catch (error) {

      console.error(
        "Unable to permanently clean up counseling request:",
        error
      );


      alert(
        error?.message ||
        "Unable to delete the counseling request safely."
      );

    } finally {

      setDeletingCounselingId(
        ""
      );
    }
  }


  async function savePrivateCounselingNotes() {

    if (
      !selected
    ) {

      return;
    }


    if (
      requestIsReadOnly(
        selected
      )
    ) {

      alert(
        "These counseling notes are read-only because the user is assigned to another counselor."
      );

      return;
    }


    try {

      setPrivateNotesSaving(
        true
      );

      setPrivateNotesMessage("");

      setPrivateNotesError("");


      const assignedCounselorId =
        selected.assignedCounselorId ||
        (
          user.role ===
            "counselor"
            ? user.id
            : ""
        );


      const assignedCounselorName =
        selected.assignedCounselorName ||
        (
          user.role ===
            "counselor"
            ? (
                user.name ||
                "Guidance Counselor"
              )
            : ""
        );


      const assignedCounselorDepartment =
        selected.assignedCounselorDepartment ||
        (
          user.role ===
            "counselor"
            ? (
                user.department ||
                ""
              )
            : ""
        );


      await setDoc(
        doc(
          db,
          "counselingSessionNotes",
          selected.id
        ),
        {
          consultationId:
            selected.id,

          ownerId:
            selected.ownerId,

          ownerName:
            selected.ownerName ||
            "",

          department:
            selected.department ||
            "",

          assignedCounselorId,

          assignedCounselorName,

          assignedCounselorDepartment,

          caseHistory:
            privateCaseHistoryDraft.trim(),

          counselingSessionSummary:
            privateSessionSummaryDraft.trim(),

          counselorObservation:
            privateObservationDraft.trim(),

          recommendedActions:
            privateRecommendedActionsDraft.trim(),

          updatedById:
            user.id,

          updatedByName:
            user.name ||
            user.email ||
            "Authorized user",

          updatedByRole:
            user.role,

          updatedAt:
            serverTimestamp(),

          ...(
            privateNotesExists
              ? {}
              : {
                  createdAt:
                    serverTimestamp()
                }
          )
        },
        {
          merge:
            true
        }
      );


      setPrivateNotesExists(
        true
      );

      setPrivateNotesLoadedFromLegacyProfile(
        false
      );

      setPrivateNotesUpdatedBy(
        user.name ||
        user.email ||
        "Authorized user"
      );

      setPrivateNotesMessage(
        "Private counseling notes saved successfully."
      );

    } catch (error) {

      console.error(
        "Unable to save private counseling notes:",
        error
      );


      setPrivateNotesError(
        error?.code ===
          "permission-denied"

          ? "You are not allowed to edit the private counseling notes for this request."

          : (
              error?.message ||
              "Unable to save private counseling notes."
            )
      );

    } finally {

      setPrivateNotesSaving(
        false
      );
    }
  }


  async function requestCounselorTransfer(
    row
  ) {

    if (!canRequestTransfer(row)) {

      alert(
        "This counseling request cannot be transferred. Transfers are only available to the currently assigned counselor before the scheduled counseling session starts."
      );

      return;
    }


    const reason =
      window.prompt(
        "Briefly state why this scheduled counseling request needs to be transferred to another counselor."
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


    if (
      !window.confirm(
        `Request another counselor to take over ${row.ownerName || "this user's"} scheduled counseling session?`
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


      const scheduledAt =
        counselingScheduledAtDate(
          row
        );


      if (
        !scheduledAt ||
        scheduledAt.getTime() <=
          Date.now()
      ) {

        throw new Error(
          "The counseling schedule has already started or the schedule is invalid. A transfer must be requested before counseling begins."
        );
      }


      const transferRef =
        doc(
          collection(
            db,
            "transferRequests"
          )
        );


      const consultationRef =
        doc(
          db,
          "consultations",
          row.id
        );


      await runTransaction(
        db,

        async transaction => {

          const consultationSnapshot =
            await transaction.get(
              consultationRef
            );


          if (
            !consultationSnapshot.exists()
          ) {

            throw new Error(
              "This counseling request no longer exists."
            );
          }


          const currentConsultation =
            consultationSnapshot.data();


          if (
            currentConsultation.status !==
              "Schedule for counseling"
          ) {

            throw new Error(
              "Only a counseling request with status Schedule for counseling can be transferred."
            );
          }


          if (
            currentConsultation.assignedCounselorId &&
            currentConsultation.assignedCounselorId !==
              user.id
          ) {

            throw new Error(
              "Only the currently assigned counselor can request this transfer."
            );
          }


          if (
            currentConsultation.transferStatus ===
              "Pending approval"
          ) {

            throw new Error(
              "A transfer request is already waiting for approval."
            );
          }


          transaction.set(
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

              scheduledAt,

              mode:
                row.mode ||
                "Face-to-face",

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


          transaction.update(
            consultationRef,
            {
              assignedCounselorId:
                currentConsultation.assignedCounselorId ||
                user.id,

              assignedCounselorName:
                currentConsultation.assignedCounselorName ||
                user.name ||
                "Guidance Counselor",

              assignedCounselorDepartment:
                currentConsultation.assignedCounselorDepartment ||
                user.department ||
                "",

              transferStatus:
                "Pending approval",

              transferRequestId:
                transferRef.id,

              updatedAt:
                serverTimestamp()
            }
          );
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
                  `${row.ownerName || "A user"} has a scheduled counseling request that ${user.name || "the assigned counselor"} needs to transfer. Open your Dashboard to review and accept the transfer if you are available.`,

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
            `${user.name || "Your assigned counselor"} requested another Guidance Counselor to take over your scheduled counseling session. Your schedule remains active while another counselor reviews the transfer request.`,

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
        "Transfer request sent. Other counselors have been notified and the transfer will only take effect after another counselor approves it."
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


      const effectiveCounselorName =
        selected.assignedCounselorName ||
        (
          user.role ===
            "counselor"
            ? user.name ||
              "Guidance Counselor"
            : ""
        );


      const effectiveCounselorDepartment =
        selected.assignedCounselorDepartment ||
        (
          user.role ===
            "counselor"
            ? user.department ||
              ""
            : ""
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


      const requestRef =
        doc(
          db,
          "consultations",
          selected.id
        );


      const requestLockRef =
        doc(
          db,
          "counselingRequestLocks",
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


          const requestLockSnapshot =
            await transaction.get(
              requestLockRef
            );


          if (!requestSnap.exists()) {

            throw new Error(
              "This counseling request no longer exists."
            );
          }


          if (
            !requestLockSnapshot.exists()
          ) {

            throw new Error(
              "This user's counseling-request eligibility record is missing. Run the counseling-request lock migration first."
            );
          }


          const storedRequest =
            requestSnap.data();


          const storedRequestLock =
            requestLockSnapshot.data();


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
              : statusDraft ===
                  "For review"
                ? "held"
                : "";


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


          if (
            storedRequest.status !==
              statusDraft &&
            storedRequestLock.latestConsultationId ===
              selected.id
          ) {

            transaction.update(
              requestLockRef,
              {
                status:
                  statusDraft,

                updatedAt:
                  serverTimestamp()
              }
            );
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
                `Your counselor updated your counseling request. Status: ${statusDraft}.${remarksDraft.trim() ? " A counselor remark is available." : ""}`,

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


  const requestManagementSources =
    isSuperAdmin
      ? [
          departmentConsultations,
          assessmentRows,
          counselors,
          transferRequests
        ]
      : [
          departmentConsultations,
          assignedConsultations,
          assessmentRows,
          counselors,
          transferRequests
        ];


  const requestManagementLoading =
    rowsAreLoading(
      ...requestManagementSources
    );


  const requestManagementError =
    firstRowsError(
      ...requestManagementSources
    );


  if (requestManagementLoading) {

    return (
      <>
        <PageTitle
          title="Counseling Requests"
          subtitle="Review, update, and manage counseling requests."
        />

        <section className="panel">
          <Empty
            text="Loading counseling requests..."
          />
        </section>
      </>
    );
  }


  if (requestManagementError) {

    return (
      <>
        <PageTitle
          title="Counseling Requests"
          subtitle="Review, update, and manage counseling requests."
        />

        <div className="error-box">
          {requestManagementError}
        </div>
      </>
    );
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

                  <strong>
                    {
                      row.ownerName ||
                      "User"
                    }
                  </strong>


                  <span className="status">
                    {
                      row.status ||
                      "Pending approval"
                    }
                  </span>


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


                    {canRequestTransfer(row) && (

                      <button
                        type="button"
                        className="transfer-user-button"
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


                    {transferRequestForConsultation(row.id) && (

                      <span className="transfer-pending-label">
                        Transfer awaiting approval
                      </span>

                    )}

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

                </div>

                <p className="review-request-modal-subtitle">
                  Review the request details, update the status,
                  and add counselor remarks.
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

              <section className="review-request-modal-card">

                <h3>
                  Request Details
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
                      Program
                    </span>

                    <strong>
                      {
                        counselorProgramLabel(
                          selected.program
                        )
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

                  Counselor remarks / instructions
                  <span className="review-field-visibility-note">
                    Visible to the user. Use Private Counseling Notes below for counselor-only documentation.
                  </span>

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

              </section>


              <section
                className="review-request-modal-card private-counseling-notes-card"
              >

                <h3>
                  Private Counseling Notes
                </h3>


                <p
                  style={{
                    marginTop:
                      0,

                    color:
                      "#667085",

                    lineHeight:
                      1.5
                  }}
                >
                  These notes are visible only to authorized Guidance Counselors
                  and the Super Admin. They are not shown on the Student,
                  Teaching, or Non-teaching user side.
                </p>


                {privateNotesUpdatedBy && (

                  <div
                    className="notice"
                    style={{
                      marginTop:
                        "10px",

                      marginBottom:
                        "12px"
                    }}
                  >
                    <strong>
                      Existing counselor documentation
                    </strong>

                    <br />

                    Last documented by:
                    {" "}
                    <strong>
                      {
                        privateNotesUpdatedBy
                      }
                    </strong>

                    {privateNotesLoadedFromLegacyProfile && (
                      <>
                        <br />
                        These notes were carried over from the user's earlier
                        counseling profile so the receiving counselor can review
                        the previous counselor's documentation.
                      </>
                    )}
                  </div>

                )}


                {privateNotesLoading

                  ? (

                    <Empty
                      text="Loading private counseling notes..."
                    />

                  )

                  : (

                    <>

                      <div className="private-counseling-notes-grid">

                        <label className="private-counseling-note-field">
                          Case History

                          <textarea
                            rows="6"
                            value={
                              privateCaseHistoryDraft
                            }
                            readOnly={
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event =>
                                setPrivateCaseHistoryDraft(
                                  event.target.value
                                )
                            }
                            placeholder="Record relevant case background, previous concerns, and important case developments."
                          />
                        </label>


                        <label className="private-counseling-note-field">
                          Summary of Counseling Session

                          <textarea
                            rows="6"
                            value={
                              privateSessionSummaryDraft
                            }
                            readOnly={
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event =>
                                setPrivateSessionSummaryDraft(
                                  event.target.value
                                )
                            }
                            placeholder="Summarize the important concerns, discussion, interventions, and session outcome."
                          />
                        </label>


                        <label className="private-counseling-note-field">
                          Counselor's Observation

                          <textarea
                            rows="6"
                            value={
                              privateObservationDraft
                            }
                            readOnly={
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event =>
                                setPrivateObservationDraft(
                                  event.target.value
                                )
                            }
                            placeholder="Record relevant professional observations from the counseling interaction."
                          />
                        </label>


                        <label className="private-counseling-note-field">
                          Recommended Actions

                          <textarea
                            rows="6"
                            value={
                              privateRecommendedActionsDraft
                            }
                            readOnly={
                              requestIsReadOnly(
                                selected
                              )
                            }
                            onChange={
                              event =>
                                setPrivateRecommendedActionsDraft(
                                  event.target.value
                                )
                            }
                            placeholder="Record follow-up steps, referrals, monitoring actions, or other recommendations."
                          />
                        </label>

                      </div>


                      {privateNotesMessage && (

                        <div
                          className="success-box"
                          style={{
                            marginTop:
                              "12px"
                          }}
                        >
                          {
                            privateNotesMessage
                          }
                        </div>

                      )}


                      {privateNotesError && (

                        <div
                          className="error-box"
                          style={{
                            marginTop:
                              "12px"
                          }}
                        >
                          {
                            privateNotesError
                          }
                        </div>

                      )}


                      <div
                        style={{
                          marginTop:
                            "14px"
                        }}
                      >

                        <button
                          type="button"
                          className="secondary-button"
                          disabled={
                            privateNotesSaving ||
                            requestIsReadOnly(
                              selected
                            )
                          }
                          onClick={
                            savePrivateCounselingNotes
                          }
                        >
                          {
                            requestIsReadOnly(
                              selected
                            )
                              ? "Private notes — read only"
                              : privateNotesSaving
                                ? "Saving private notes..."
                                : "Save private counseling notes"
                          }
                        </button>

                      </div>

                    </>

                  )
                }

              </section>


              {isSuperAdmin && (

                <div className="superadmin-cleanup-zone superadmin-cleanup-zone-full">

                  <div>

                    <strong>
                      Super Admin test-data cleanup
                    </strong>

                    <p>
                      Use only for test or erroneous records. Approved counselor
                      transfers are protected so counselor assignment history is
                      not accidentally broken.
                    </p>

                  </div>


                  <div className="superadmin-cleanup-actions">

                    {transferRequestForConsultation(
                      selected.id
                    ) && (

                      <button
                        type="button"
                        className="danger-button danger-button-outline superadmin-cleanup-delete-button"
                        title="Delete pending transfer request"
                        disabled={
                          deletingTransferId ===
                          transferRequestForConsultation(
                            selected.id
                          )?.id
                        }
                        onClick={
                          () =>
                            deletePendingTransferRecord(
                              transferRequestForConsultation(
                                selected.id
                              )
                            )
                        }
                      >
                        {
                          deletingTransferId ===
                            transferRequestForConsultation(
                              selected.id
                            )?.id
                            ? "Deleting transfer..."
                            : "Delete"
                        }
                      </button>

                    )}


                    {approvedTransferForConsultation(
                      selected.id
                    ) && (

                      <span className="cleanup-protected-label">
                        Approved transfer history protected
                      </span>

                    )}


                    <button
                      type="button"
                      className="danger-button superadmin-cleanup-delete-button"
                      title="Delete counseling request"
                      disabled={
                        deletingCounselingId ===
                        selected.id ||
                        Boolean(
                          approvedTransferForConsultation(
                            selected.id
                          )
                        )
                      }
                      onClick={
                        deleteSelectedCounselingRequest
                      }
                    >
                      {
                        deletingCounselingId ===
                          selected.id
                          ? "Deleting counseling request..."
                          : "Delete"
                      }
                    </button>

                  </div>

                </div>

              )}


              <div className="review-request-workflow-footer">

                {canRequestTransfer(
                  selected
                ) && (

                  <button
                    type="button"
                    className="transfer-user-button"
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


                <div className="review-request-modal-actions">

                  <button

                    type="button"

                    className="secondary-button"

                    onClick={
                      closeRequestReview
                    }

                  >
                    Close
                  </button>


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
                          : "Save request update"
                    }

                  </button>

                </div>

              </div>

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


  const [
    scheduleFilter,
    setScheduleFilter
  ] = useState(
    "Upcoming"
  );


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


  const pendingTransferRows =
    useRows(
      "transferRequests",
      isSuperAdmin
        ? {
            status:
              "Pending approval"
          }
        : {
            status:
              "Pending approval"
          }
    );


  const incomingTransferRequests =
    isSuperAdmin
      ? []
      : pendingTransferRows.filter(
          row =>
            row.requestedById !==
            user.id
        );


  const outgoingTransferRequests =
    isSuperAdmin
      ? []
      : pendingTransferRows.filter(
          row =>
            row.requestedById ===
            user.id
        );


  const pendingTransferByConsultation =
    new Map(
      pendingTransferRows.map(
        row => [
          row.consultationId,
          row
        ]
      )
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


  const todayKey =
    useMemo(
      () => {

        const now =
          new Date();


        const year =
          now.getFullYear();


        const month =
          String(
            now.getMonth() + 1
          ).padStart(
            2,
            "0"
          );


        const day =
          String(
            now.getDate()
          ).padStart(
            2,
            "0"
          );


        return `${year}-${month}-${day}`;
      },
      []
    );


  const appointments =
    useMemo(
      () =>
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


              if (
                dateDifference !==
                0
              ) {

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
          ),
      [rows]
    );


  function normalizedStatus(
    row
  ) {

    return String(
      row?.status ||
      "For review"
    ).trim();
  }


  function isPendingAppointment(
    row
  ) {

    const status =
      normalizedStatus(
        row
      );


    return (
      status ===
        "Pending approval" ||
      status ===
        "For review"
    );
  }


  function isScheduledAppointment(
    row
  ) {

    return (
      normalizedStatus(
        row
      ) ===
      "Schedule for counseling"
    );
  }


  function isConcludedAppointment(
    row
  ) {

    return (
      normalizedStatus(
        row
      ) ===
      "Concluded"
    );
  }


  function isOutcomeAppointment(
    row
  ) {

    const status =
      normalizedStatus(
        row
      );


    return [
      "Follow up is recommended",
      "Counseling is optional",
      "For referral"
    ].includes(
      status
    );
  }


  function isOperationalAppointment(
    row
  ) {

    return (
      isPendingAppointment(
        row
      ) ||
      isScheduledAppointment(
        row
      )
    );
  }


  function pendingTransferFor(
    row
  ) {

    return (
      pendingTransferByConsultation.get(
        row.id
      ) ||
      null
    );
  }


  function canTransferFromSchedule(
    row
  ) {

    if (
      isSuperAdmin ||
      user.role !==
        "counselor" ||
      !isScheduledAppointment(
        row
      ) ||
      !row.date ||
      !row.time ||
      appointmentHasStarted(
        row
      ) ||
      pendingTransferFor(
        row
      )
    ) {

      return false;
    }


    return (
      !row.assignedCounselorId ||
      row.assignedCounselorId ===
        user.id
    );
  }


  function isTransferRelatedAppointment(
    row
  ) {

    return Boolean(
      pendingTransferFor(
        row
      ) ||
      row.transferStatus ||
      row.transferredFromCounselorId ||
      canTransferFromSchedule(
        row
      )
    );
  }


  function isTodayAppointment(
    row
  ) {

    return (
      row.date ===
      todayKey
    );
  }


  function isUpcomingAppointment(
    row
  ) {

    return (
      row.date >=
        todayKey &&
      isOperationalAppointment(
        row
      )
    );
  }


  const scheduleCounts =
    useMemo(
      () => ({
        today:
          appointments.filter(
            row =>
              isTodayAppointment(
                row
              ) &&
              isOperationalAppointment(
                row
              )
          ).length,

        pending:
          appointments.filter(
            row =>
              row.date >=
                todayKey &&
              isPendingAppointment(
                row
              )
          ).length,

        scheduled:
          appointments.filter(
            row =>
              row.date >=
                todayKey &&
              isScheduledAppointment(
                row
              )
          ).length,

        upcoming:
          appointments.filter(
            isUpcomingAppointment
          ).length,

        transfers:
          appointments.filter(
            isTransferRelatedAppointment
          ).length
      }),
      [
        appointments,
        todayKey
      ]
    );


  const visibleAppointments =
    useMemo(
      () =>
        appointments.filter(
          row => {

            if (
              scheduleFilter ===
              "Today"
            ) {

              return (
                isTodayAppointment(
                  row
                ) &&
                isOperationalAppointment(
                  row
                )
              );
            }


            if (
              scheduleFilter ===
              "Upcoming"
            ) {

              return isUpcomingAppointment(
                row
              );
            }


            if (
              scheduleFilter ===
              "Pending"
            ) {

              return isPendingAppointment(
                row
              );
            }


            if (
              scheduleFilter ===
              "Scheduled"
            ) {

              return isScheduledAppointment(
                row
              );
            }


            if (
              scheduleFilter ===
              "Completed"
            ) {

              return isConcludedAppointment(
                row
              );
            }


            if (
              scheduleFilter ===
              "Outcomes"
            ) {

              return isOutcomeAppointment(
                row
              );
            }


            if (
              scheduleFilter ===
              "Transfers"
            ) {

              return isTransferRelatedAppointment(
                row
              );
            }


            return true;
          }
        ),
      [
        appointments,
        scheduleFilter,
        todayKey
      ]
    );


  const groupedAppointments =
    useMemo(
      () => {

        const groups =
          new Map();


        visibleAppointments.forEach(
          row => {

            const key =
              row.date;


            if (
              !groups.has(
                key
              )
            ) {

              groups.set(
                key,
                []
              );
            }


            groups
              .get(
                key
              )
              .push(
                row
              );
          }
        );


        return Array.from(
          groups.entries()
        ).map(
          ([date, items]) => ({
            date,
            items
          })
        );
      },
      [
        visibleAppointments
      ]
    );


  const duplicateOperationalSlots =
    useMemo(
      () => {

        const counts =
          new Map();


        appointments
          .filter(
            row =>
              row.date >=
                todayKey &&
              isOperationalAppointment(
                row
              )
          )
          .forEach(
            row => {

              const key =
                `${row.date}|${row.time}`;


              counts.set(
                key,
                (
                  counts.get(
                    key
                  ) ||
                  0
                ) + 1
              );
            }
          );


        return new Set(
          Array.from(
            counts.entries()
          )
            .filter(
              ([, count]) =>
                count > 1
            )
            .map(
              ([key]) =>
                key
            )
        );
      },
      [
        appointments,
        todayKey
      ]
    );


  function formatScheduleDate(
    dateText
  ) {

    const parsed =
      new Date(
        `${dateText}T00:00:00`
      );


    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {

      return dateText;
    }


    return parsed
      .toLocaleDateString(
        "en-PH",
        {
          weekday:
            "long",

          month:
            "long",

          day:
            "numeric",

          year:
            "numeric"
        }
      )
      .toUpperCase();
  }


  function statusAppearance(
    status
  ) {

    if (
      status ===
      "Schedule for counseling"
    ) {

      return {
        background:
          "#e8f7ee",

        color:
          "#166534",

        border:
          "1px solid #bbf7d0"
      };
    }


    if (
      status ===
      "Pending approval" ||
      status ===
      "For review"
    ) {

      return {
        background:
          "#fff7e6",

        color:
          "#92400e",

        border:
          "1px solid #fde68a"
      };
    }


    if (
      status ===
      "Follow up is recommended"
    ) {

      return {
        background:
          "#fff1f2",

        color:
          "#9f1239",

        border:
          "1px solid #fecdd3"
      };
    }


    if (
      status ===
      "For referral"
    ) {

      return {
        background:
          "#f3e8ff",

        color:
          "#6b21a8",

        border:
          "1px solid #e9d5ff"
      };
    }


    if (
      status ===
      "Counseling is optional"
    ) {

      return {
        background:
          "#eef2ff",

        color:
          "#3730a3",

        border:
          "1px solid #c7d2fe"
      };
    }


    if (
      status ===
      "Concluded"
    ) {

      return {
        background:
          "#f1f5f9",

        color:
          "#475569",

        border:
          "1px solid #cbd5e1"
      };
    }


    return {
      background:
        "#eef2ff",

      color:
        "#1e3a8a",

      border:
        "1px solid #c7d2fe"
    };
  }


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


  const scheduleLoading =
    rowsAreLoading(
      departmentRows,
      ...(
        isSuperAdmin
          ? []
          : [
              transferredAssignedRows,
              pendingTransferRows
            ]
      )
    );


  const scheduleError =
    firstRowsError(
      departmentRows,
      ...(
        isSuperAdmin
          ? []
          : [
              transferredAssignedRows,
              pendingTransferRows
            ]
      )
    );


  if (
    scheduleLoading
  ) {

    return (
      <>
        <PageTitle
          title="Counselor Schedule"
          subtitle="Upcoming counseling activity is grouped by date and time."
        />

        <section className="panel">
          <Empty
            text="Loading counselor schedule..."
          />
        </section>
      </>
    );
  }


  if (
    scheduleError
  ) {

    return (
      <>
        <PageTitle
          title="Counselor Schedule"
          subtitle="Upcoming counseling activity is grouped by date and time."
        />

        <div className="error-box">
          {scheduleError}
        </div>
      </>
    );
  }


  const filterOptions = [
    "Upcoming",
    "Today",
    "Pending",
    "Scheduled",
    "Transfers",
    "Outcomes",
    "Completed",
    "All"
  ];


  return (

    <>

      <PageTitle

        title="Counselor Schedule"

        subtitle="Upcoming counseling activity is grouped by date and time. Completed and outcome records are separated from the default schedule."

      />


      <section
        className="panel"
        style={{
          maxWidth:
            "1180px",

          marginLeft:
            "auto",

          marginRight:
            "auto"
        }}
      >

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(5, minmax(0, 1fr))",

            gap:
              "12px",

            marginBottom:
              "18px"
          }}
          className="schedule-summary-grid"
        >

          {[
            {
              label:
                "Today",

              value:
                scheduleCounts.today
            },

            {
              label:
                "Pending",

              value:
                scheduleCounts.pending
            },

            {
              label:
                "Scheduled",

              value:
                scheduleCounts.scheduled
            },

            {
              label:
                "Upcoming",

              value:
                scheduleCounts.upcoming
            },

            {
              label:
                "Transfers",

              value:
                scheduleCounts.transfers
            }
          ].map(
            item => (

              <div
                key={
                  item.label
                }
                style={{
                  border:
                    "1px solid #d7e0ee",

                  borderRadius:
                    "14px",

                  padding:
                    "14px 16px",

                  background:
                    "#ffffff"
                }}
              >

                <div
                  style={{
                    fontSize:
                      "0.82rem",

                    color:
                      "#64748b",

                    marginBottom:
                      "4px"
                  }}
                >
                  {item.label}
                </div>

                <strong
                  style={{
                    fontSize:
                      "1.35rem"
                  }}
                >
                  {item.value}
                </strong>

              </div>

            )
          )}

        </div>


        <div
          style={{
            display:
              "flex",

            flexWrap:
              "wrap",

            gap:
              "8px",

            alignItems:
              "center",

            marginBottom:
              "18px"
          }}
        >

          {filterOptions.map(
            option => {

              const selected =
                scheduleFilter ===
                option;


              return (

                <button
                  type="button"
                  key={
                    option
                  }
                  onClick={
                    () =>
                      setScheduleFilter(
                        option
                      )
                  }
                  style={{
                    border:
                      selected
                        ? "1px solid #1d4ed8"
                        : "1px solid #d7e0ee",

                    background:
                      selected
                        ? "#1d4ed8"
                        : "#ffffff",

                    color:
                      selected
                        ? "#ffffff"
                        : "#334155",

                    borderRadius:
                      "999px",

                    padding:
                      "8px 14px",

                    fontWeight:
                      700,

                    cursor:
                      "pointer"
                  }}
                >
                  {option}
                </button>

              );
            }
          )}

        </div>


        {!isSuperAdmin && (

          <div
            className="notice"
            style={{
              marginBottom:
                "18px",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              gap:
                "14px",

              flexWrap:
                "wrap"
            }}
          >

            <div>

              <strong>
                Counselor transfer tools
              </strong>

              <div
                style={{
                  marginTop:
                    "4px"
                }}
              >
                Scheduled sessions assigned to you can still be transferred
                before the appointment starts. Cards will show
                {" "}
                <strong>
                  Transfer available
                </strong>
                {" "}
                or
                {" "}
                <strong>
                  Transfer awaiting approval
                </strong>
                {" "}
                when applicable.
              </div>

            </div>


            <button
              type="button"
              className="secondary-button"
              onClick={
                () =>
                  navigate(
                    "/dashboard"
                  )
              }
            >
              {
                incomingTransferRequests.length >
                0
                  ? `Incoming transfer requests (${incomingTransferRequests.length})`
                  : "View transfer requests"
              }
            </button>

          </div>

        )}


        {
          duplicateOperationalSlots.size >
          0
        && (

          <div
            className="notice"
            style={{
              marginBottom:
                "18px"
            }}
          >

            <strong>
              Schedule check:
            </strong>
            {" "}
            MindTrack detected
            {" "}
            {
              duplicateOperationalSlots.size
            }
            {" "}
            active date/time
            {
              duplicateOperationalSlots.size ===
              1
                ? " slot"
                : " slots"
            }
            {" "}
            with more than one pending or scheduled request.
            Review the highlighted appointments to make sure there is no counselor conflict.

          </div>

        )}


        {
          visibleAppointments.length ===
          0

            ? (

              <Empty
                text={
                  scheduleFilter ===
                  "Upcoming"

                    ? "No upcoming counseling appointments."

                    : scheduleFilter ===
                        "Transfers"

                      ? "No transfer-related counseling requests."

                      : `No ${scheduleFilter.toLowerCase()} appointments.`
                }
              />

            )

            : groupedAppointments.map(
                group => (

                  <section
                    key={
                      group.date
                    }
                    style={{
                      marginBottom:
                        "24px"
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",

                        alignItems:
                          "center",

                        gap:
                          "12px",

                        marginBottom:
                          "12px"
                      }}
                    >

                      <strong
                        style={{
                          fontSize:
                            "0.9rem",

                          letterSpacing:
                            "0.035em",

                          color:
                            "#334155",

                          whiteSpace:
                            "nowrap"
                        }}
                      >
                        {
                          formatScheduleDate(
                            group.date
                          )
                        }
                      </strong>


                      <div
                        style={{
                          height:
                            "1px",

                          background:
                            "#dbe3ef",

                          flex:
                            1
                        }}
                      />

                    </div>


                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",

                        gap:
                          "12px"
                      }}
                      className="schedule-organized-grid"
                    >

                      {group.items.map(
                        row => {

                          const status =
                            normalizedStatus(
                              row
                            );


                          const appearance =
                            statusAppearance(
                              status
                            );


                          const slotKey =
                            `${row.date}|${row.time}`;


                          const hasPossibleConflict =
                            duplicateOperationalSlots.has(
                              slotKey
                            ) &&
                            isOperationalAppointment(
                              row
                            );


                          const pendingTransfer =
                            pendingTransferFor(
                              row
                            );


                          const transferAvailable =
                            canTransferFromSchedule(
                              row
                            );


                          const transferredToCurrentCounselor =
                            Boolean(
                              row.transferredFromCounselorId &&
                              row.assignedCounselorId ===
                                user.id
                            );


                          return (

                            <button
                              type="button"
                              className="schedule-card-button"
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
                              style={{
                                width:
                                  "100%",

                                minHeight:
                                  "150px",

                                display:
                                  "grid",

                                gridTemplateColumns:
                                  "44px minmax(0, 1fr)",

                                gap:
                                  "12px",

                                textAlign:
                                  "left",

                                border:
                                  hasPossibleConflict
                                    ? "1px solid #f59e0b"
                                    : "1px solid #d7e0ee",

                                borderRadius:
                                  "14px",

                                background:
                                  "#ffffff",

                                padding:
                                  "16px",

                                cursor:
                                  "pointer",

                                boxShadow:
                                  "0 1px 2px rgba(15, 23, 42, 0.03)"
                              }}
                            >

                              <div
                                style={{
                                  width:
                                    "40px",

                                  height:
                                    "40px",

                                  borderRadius:
                                    "12px",

                                  background:
                                    "#eef4ff",

                                  display:
                                    "grid",

                                  placeItems:
                                    "center",

                                  color:
                                    "#1d4ed8"
                                }}
                              >
                                <Calendar
                                  size={
                                    20
                                  }
                                />
                              </div>


                              <div
                                style={{
                                  minWidth:
                                    0,

                                  display:
                                    "flex",

                                  flexDirection:
                                    "column",

                                  height:
                                    "100%"
                                }}
                              >

                                <div
                                  style={{
                                    display:
                                      "flex",

                                    justifyContent:
                                      "space-between",

                                    gap:
                                      "12px",

                                    alignItems:
                                      "flex-start"
                                  }}
                                >

                                  <strong
                                    style={{
                                      fontSize:
                                        "1rem",

                                      color:
                                        "#0f172a"
                                    }}
                                  >
                                    {
                                      row.time
                                    }
                                  </strong>


                                  {hasPossibleConflict && (

                                    <span
                                      style={{
                                        fontSize:
                                          "0.72rem",

                                        fontWeight:
                                          800,

                                        color:
                                          "#92400e",

                                        background:
                                          "#fff7e6",

                                        border:
                                          "1px solid #fde68a",

                                        padding:
                                          "4px 7px",

                                        borderRadius:
                                          "999px",

                                        whiteSpace:
                                          "nowrap"
                                      }}
                                    >
                                      Check conflict
                                    </span>

                                  )}

                                </div>


                                <div
                                  style={{
                                    marginTop:
                                      "8px",

                                    fontWeight:
                                      700,

                                    color:
                                      "#1e293b"
                                  }}
                                >
                                  {
                                    row.ownerName ||
                                    "User"
                                  }
                                </div>


                                <div
                                  style={{
                                    marginTop:
                                      "3px",

                                    color:
                                      "#64748b",

                                    lineHeight:
                                      1.4
                                  }}
                                >

                                  {
                                    row.program ||
                                    row.department ||
                                    "Program not specified"
                                  }

                                  {row.mode && (
                                    <>
                                      {" · "}
                                      {row.mode}
                                    </>
                                  )}

                                </div>


                                {
                                  (
                                    pendingTransfer ||
                                    transferAvailable ||
                                    transferredToCurrentCounselor
                                  ) && (

                                    <div
                                      style={{
                                        display:
                                          "flex",

                                        flexWrap:
                                          "wrap",

                                        gap:
                                          "6px",

                                        marginTop:
                                          "10px"
                                      }}
                                    >

                                      {pendingTransfer && (

                                        <span
                                          style={{
                                            background:
                                              "#fff7e6",

                                            color:
                                              "#92400e",

                                            border:
                                              "1px solid #fde68a",

                                            borderRadius:
                                              "999px",

                                            padding:
                                              "4px 8px",

                                            fontSize:
                                              "0.72rem",

                                            fontWeight:
                                              800
                                          }}
                                        >
                                          Transfer awaiting approval
                                        </span>

                                      )}


                                      {transferAvailable && (

                                        <span
                                          style={{
                                            background:
                                              "#eef2ff",

                                            color:
                                              "#3730a3",

                                            border:
                                              "1px solid #c7d2fe",

                                            borderRadius:
                                              "999px",

                                            padding:
                                              "4px 8px",

                                            fontSize:
                                              "0.72rem",

                                            fontWeight:
                                              800
                                          }}
                                        >
                                          Transfer available
                                        </span>

                                      )}


                                      {transferredToCurrentCounselor && (

                                        <span
                                          style={{
                                            background:
                                              "#ecfdf5",

                                            color:
                                              "#166534",

                                            border:
                                              "1px solid #bbf7d0",

                                            borderRadius:
                                              "999px",

                                            padding:
                                              "4px 8px",

                                            fontSize:
                                              "0.72rem",

                                            fontWeight:
                                              800
                                          }}
                                        >
                                          Transferred to you
                                        </span>

                                      )}

                                    </div>

                                  )
                                }


                                <div
                                  style={{
                                    display:
                                      "flex",

                                    justifyContent:
                                      "space-between",

                                    alignItems:
                                      "center",

                                    gap:
                                      "10px",

                                    flexWrap:
                                      "wrap",

                                    marginTop:
                                      "auto",

                                    paddingTop:
                                      "14px"
                                  }}
                                >

                                  <span
                                    style={{
                                      ...appearance,

                                      display:
                                        "inline-flex",

                                      alignItems:
                                        "center",

                                      borderRadius:
                                        "999px",

                                      padding:
                                        "5px 9px",

                                      fontSize:
                                        "0.75rem",

                                      fontWeight:
                                        700
                                    }}
                                  >
                                    {status}
                                  </span>


                                  <span
                                    style={{
                                      fontSize:
                                        "0.8rem",

                                      fontWeight:
                                        800,

                                      color:
                                        "#1d4ed8"
                                    }}
                                  >
                                    {
                                      pendingTransfer
                                        ? "View transfer"
                                        : transferAvailable
                                          ? "Open to transfer"
                                          : "Open request"
                                    }
                                  </span>

                                </div>

                              </div>

                            </button>

                          );
                        }
                      )}

                    </div>

                  </section>

                )
              )
        }

      </section>


      <style>
        {`
          @media (max-width: 900px) {
            .schedule-summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .schedule-organized-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }

          @media (max-width: 560px) {
            .schedule-summary-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }
        `}
      </style>

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


  if (users.loading) {

    return (
      <>
        <PageTitle
          title="Account Management"
          subtitle="Super Admin overview of Student, Teaching, Non-teaching, Counselor, and Super Admin accounts."
        />

        <section className="panel">
          <Empty
            text="Loading accounts..."
          />
        </section>
      </>
    );
  }


  if (users.error) {

    return (
      <>
        <PageTitle
          title="Account Management"
          subtitle="Super Admin overview of Student, Teaching, Non-teaching, Counselor, and Super Admin accounts."
        />

        <div className="error-box">
          {users.error}
        </div>
      </>
    );
  }


  return (

    <>

      <PageTitle

        title="Account Management"

        subtitle="Super Admin overview of Student, Teaching, Non-teaching, Counselor, and Super Admin accounts."

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
                        systemRoleLabel(
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

                                  <td>
                                    {
                                      systemRoleLabel(
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

function Reports() {

  const { user } =
    useAuth();


  const isSuperAdmin =
    user.role ===
    "super_admin";


  const analyticsFilters =
    isSuperAdmin
      ? {}
      : {
          department:
            user.department
        };


  const assessments =
    useRows(
      "assessments",
      analyticsFilters
    );


  const consultations =
    useRows(
      "consultations",
      analyticsFilters
    );


  // Gender is stored in users/{uid}, while assessment and
  // consultation records primarily store department/program.
  // Join the records by ownerId so analytics can be grouped by sex
  // without duplicating sensitive/private profile information.
  const analyticsUsers =
    useRows(
      "users",
      analyticsFilters
    );


  const reportsLoading =
    rowsAreLoading(
      assessments,
      consultations,
      analyticsUsers
    );


  const reportsError =
    firstRowsError(
      assessments,
      consultations,
      analyticsUsers
    );


  if (reportsLoading) {

    return (
      <>
        <PageTitle
          title="Reports and Analytics"
          subtitle="Live assessment and counseling analytics."
        />

        <section className="panel">
          <Empty
            text="Loading analytics..."
          />
        </section>
      </>
    );
  }


  if (reportsError) {

    return (
      <>
        <PageTitle
          title="Reports and Analytics"
          subtitle="Live assessment and counseling analytics."
        />

        <div className="error-box">
          {reportsError}
          <br />
          Analytics cannot be calculated until all required data loads successfully.
        </div>
      </>
    );
  }


  const priorityLevels = [
    "Low",
    "Moderate",
    "High",
    "Critical"
  ];


  const priorityColors = {
    Low:
      "#168a4b",

    Moderate:
      "#c89412",

    High:
      "#dc6d13",

    Critical:
      "#bd2424"
  };


  const profileById =
    new Map(
      analyticsUsers.map(
        profile => [
          profile.id,
          profile
        ]
      )
    );


  function profileForRecord(
    row
  ) {

    return (
      profileById.get(
        row.ownerId
      ) ||
      null
    );
  }


  function recordDepartment(
    row
  ) {

    const profile =
      profileForRecord(
        row
      );


    return String(
      row.department ||
      profile?.department ||
      "Not specified"
    ).trim() ||
    "Not specified";
  }


  function recordProgram(
    row
  ) {

    const profile =
      profileForRecord(
        row
      );


    const program =
      String(
        row.program ||
        profile?.program ||
        ""
      ).trim();


    if (!program) {

      return (
        isSuperAdmin
          ? `${recordDepartment(row)} — No program / N/A`
          : "No program / N/A"
      );
    }


    return (
      isSuperAdmin
        ? `${recordDepartment(row)} — ${program}`
        : program
    );
  }


  function recordSex(
    row
  ) {

    const profile =
      profileForRecord(
        row
      );


    const value =
      String(
        profile?.gender ||
        row.gender ||
        ""
      )
        .trim()
        .toLowerCase();


    if (value === "male") {
      return "Male";
    }


    if (value === "female") {
      return "Female";
    }


    return "Not specified";
  }


  function categorySort(
    a,
    b
  ) {

    if (
      a.label ===
      "Not specified"
    ) {
      return 1;
    }


    if (
      b.label ===
      "Not specified"
    ) {
      return -1;
    }


    return a.label.localeCompare(
      b.label
    );
  }


  function buildPriorityBreakdown(
    rows,
    categoryGetter
  ) {

    const grouped =
      new Map();


    rows.forEach(
      row => {

        const label =
          categoryGetter(
            row
          );


        if (
          !grouped.has(
            label
          )
        ) {

          grouped.set(
            label,
            {
              label,
              Low: 0,
              Moderate: 0,
              High: 0,
              Critical: 0,
              total: 0
            }
          );
        }


        const item =
          grouped.get(
            label
          );


        if (
          priorityLevels.includes(
            row.priority
          )
        ) {

          item[
            row.priority
          ] += 1;
        }


        item.total += 1;
      }
    );


    return Array.from(
      grouped.values()
    )
      .sort(
        categorySort
      );
  }


  function isScheduledCounseling(
    row
  ) {

    return (
      row.status ===
      "Schedule for counseling"
    );
  }


  function buildCounselingBreakdown(
    rows,
    categoryGetter
  ) {

    const grouped =
      new Map();


    rows.forEach(
      row => {

        const label =
          categoryGetter(
            row
          );


        if (
          !grouped.has(
            label
          )
        ) {

          grouped.set(
            label,
            {
              label,
              requests: 0,
              scheduledSessions: 0
            }
          );
        }


        const item =
          grouped.get(
            label
          );


        item.requests += 1;


        if (
          isScheduledCounseling(
            row
          )
        ) {

          item.scheduledSessions +=
            1;
        }
      }
    );


    return Array.from(
      grouped.values()
    )
      .sort(
        categorySort
      );
  }


  const priorityByCollege =
    buildPriorityBreakdown(
      assessments,
      recordDepartment
    );


  const priorityByProgram =
    buildPriorityBreakdown(
      assessments,
      recordProgram
    );


  const priorityBySex =
    buildPriorityBreakdown(
      assessments,
      recordSex
    );


  const counselingByCollege =
    buildCounselingBreakdown(
      consultations,
      recordDepartment
    );


  const counselingByProgram =
    buildCounselingBreakdown(
      consultations,
      recordProgram
    );


  const counselingBySex =
    buildCounselingBreakdown(
      consultations,
      recordSex
    );


  const priorityTotals =
    priorityLevels.reduce(
      (
        totals,
        priority
      ) => {

        totals[
          priority
        ] =
          assessments.filter(
            row =>
              row.priority ===
              priority
          ).length;


        return totals;
      },
      {}
    );


  const scheduledSessions =
    consultations.filter(
      isScheduledCounseling
    ).length;


  const analyticsScope =
    isSuperAdmin
      ? "All colleges and offices"
      : (
          user.department ||
          "Assigned college / office"
        );


  const generatedAt =
    new Date()
      .toLocaleString(
        "en-PH",
        {
          dateStyle:
            "medium",

          timeStyle:
            "short"
        }
      );


  function AnalyticsLegend({
    series
  }) {

    return (

      <div className="analytics-legend">

        {series.map(
          item => (

            <span
              key={
                item.key
              }
            >

              <i
                style={{
                  background:
                    item.color
                }}
              />

              {
                item.label
              }

            </span>

          )
        )}

      </div>

    );
  }


  function AnalyticsBarChart({
    title,
    subtitle,
    rows,
    series,
    emptyText
  }) {

    const maxValue =
      Math.max(
        1,
        ...rows.flatMap(
          row =>
            series.map(
              item =>
                Number(
                  row[
                    item.key
                  ] ||
                  0
                )
            )
        )
      );


    return (

      <section className="panel analytics-chart-panel">

        <div className="analytics-chart-heading">

          <div>

            <h2>
              {title}
            </h2>

            <p>
              {subtitle}
            </p>

          </div>


          <AnalyticsLegend
            series={series}
          />

        </div>


        {rows.length === 0

          ? (

            <Empty
              text={emptyText}
            />

          )

          : (

            <div className="analytics-chart-list">

              {rows.map(
                row => (

                  <div
                    className="analytics-chart-category"
                    key={
                      row.label
                    }
                  >

                    <div className="analytics-chart-category-label">
                      {row.label}
                    </div>


                    <div className="analytics-chart-series">

                      {series.map(
                        item => {

                          const value =
                            Number(
                              row[
                                item.key
                              ] ||
                              0
                            );


                          return (

                            <div
                              className="analytics-chart-row"
                              key={
                                `${row.label}-${item.key}`
                              }
                            >

                              <span className="analytics-series-name">
                                {item.shortLabel || item.label}
                              </span>


                              <div className="analytics-bar-track">

                                <i
                                  className="analytics-bar-fill"
                                  style={{
                                    width:
                                      `${
                                        (
                                          value /
                                          maxValue
                                        ) *
                                        100
                                      }%`,

                                    background:
                                      item.color
                                  }}
                                />

                              </div>


                              <b>
                                {value}
                              </b>

                            </div>

                          );
                        }
                      )}

                    </div>

                  </div>

                )
              )}

            </div>

          )
        }

      </section>

    );
  }


  const prioritySeries =
    priorityLevels.map(
      priority => ({
        key:
          priority,

        label:
          priority,

        color:
          priorityColors[
            priority
          ]
      })
    );


  const counselingSeries = [
    {
      key:
        "requests",

      label:
        "Counseling requests",

      shortLabel:
        "Requests",

      color:
        "#173f8f"
    },
    {
      key:
        "scheduledSessions",

      label:
        "Scheduled counseling",

      shortLabel:
        "Scheduled",

      color:
        "#6d48b5"
    }
  ];


  return (

    <div className="analytics-page">

      <style>
        {`
          .analytics-page {
            width: 100%;
          }

          .analytics-print-header {
            display: none;
          }

          .analytics-scope-card {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 18px;
            padding: 14px 18px;
            border: 1px solid #dfe3eb;
            border-radius: 14px;
            background: #ffffff;
          }

          .analytics-scope-card strong {
            display: block;
            margin-bottom: 3px;
            color: #172033;
          }

          .analytics-scope-card span,
          .analytics-scope-card small {
            color: #687084;
          }

          .analytics-section-heading {
            margin: 28px 0 10px;
          }

          .analytics-section-heading h2 {
            margin: 0 0 5px;
            color: #172033;
            font-size: 22px;
          }

          .analytics-section-heading p {
            margin: 0;
            color: #687084;
          }

          .analytics-chart-panel {
            break-inside: avoid;
          }

          .analytics-chart-heading {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            flex-wrap: wrap;
            margin-bottom: 20px;
          }

          .analytics-chart-heading h2 {
            margin: 0 0 5px;
          }

          .analytics-chart-heading p {
            margin: 0;
            color: #687084;
            line-height: 1.45;
          }

          .analytics-legend {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 8px 14px;
          }

          .analytics-legend span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: #536174;
            font-size: 12px;
            font-weight: 700;
          }

          .analytics-legend i {
            width: 11px;
            height: 11px;
            border-radius: 3px;
            flex: 0 0 11px;
          }

          .analytics-chart-list {
            display: grid;
            gap: 18px;
          }

          .analytics-chart-category {
            display: grid;
            grid-template-columns: minmax(170px, 260px) 1fr;
            gap: 18px;
            align-items: start;
            padding: 14px 0;
            border-bottom: 1px solid #edf0f4;
          }

          .analytics-chart-category:last-child {
            border-bottom: 0;
          }

          .analytics-chart-category-label {
            color: #172033;
            font-size: 13px;
            font-weight: 800;
            line-height: 1.4;
            overflow-wrap: anywhere;
          }

          .analytics-chart-series {
            display: grid;
            gap: 8px;
          }

          .analytics-chart-row {
            display: grid;
            grid-template-columns: 78px minmax(120px, 1fr) 36px;
            gap: 10px;
            align-items: center;
          }

          .analytics-series-name {
            color: #687084;
            font-size: 11px;
            font-weight: 700;
          }

          .analytics-bar-track {
            height: 14px;
            overflow: hidden;
            border-radius: 999px;
            background: #edf0f5;
          }

          .analytics-bar-fill {
            display: block;
            min-width: 0;
            height: 100%;
            border-radius: 999px;
            transition: width 180ms ease;
          }

          .analytics-chart-row b {
            color: #172033;
            font-size: 12px;
            text-align: right;
          }

          .analytics-print-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 22px;
          }

          @media (max-width: 800px) {
            .analytics-chart-category {
              grid-template-columns: 1fr;
              gap: 10px;
            }

            .analytics-chart-row {
              grid-template-columns: 70px minmax(80px, 1fr) 32px;
            }
          }

          @media print {
            .sidebar,
            .topbar,
            .analytics-print-actions {
              display: none !important;
            }

            .workspace {
              width: 100% !important;
              margin-left: 0 !important;
            }

            .content {
              max-width: none !important;
              padding: 0 !important;
            }

            .analytics-print-header {
              display: block !important;
              margin-bottom: 18px;
              padding-bottom: 12px;
              border-bottom: 2px solid #173f8f;
            }

            .analytics-print-header h1 {
              margin: 0 0 5px;
              font-size: 24px;
            }

            .analytics-print-header p {
              margin: 3px 0;
              color: #536174;
              font-size: 11px;
            }

            .page-title {
              display: none !important;
            }

            .analytics-scope-card,
            .stat-card,
            .analytics-chart-panel,
            .feedback-analytics-panel {
              box-shadow: none !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            .analytics-chart-panel {
              margin-top: 14px !important;
              padding: 16px !important;
            }

            .analytics-section-heading {
              break-after: avoid;
              page-break-after: avoid;
            }

            .analytics-bar-fill,
            .analytics-legend i,
            .priority,
            .stat-card > div {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .analytics-chart-category {
              grid-template-columns: 190px 1fr;
              gap: 12px;
              padding: 9px 0;
            }

            .analytics-chart-row {
              grid-template-columns: 64px 1fr 28px;
              gap: 7px;
            }

            .analytics-chart-heading {
              margin-bottom: 12px;
            }

            .analytics-chart-heading h2 {
              font-size: 16px;
            }

            .analytics-chart-heading p,
            .analytics-scope-card,
            .analytics-legend span {
              font-size: 10px;
            }
          }
        `}
      </style>


      <div className="analytics-print-header">

        <h1>
          MindTrack Reports and Analytics
        </h1>

        <p>
          Scope:
          {" "}
          {analyticsScope}
        </p>

        <p>
          Generated:
          {" "}
          {generatedAt}
        </p>

      </div>


      <PageTitle

        title="Reports and Analytics"

        subtitle="Assessment priority and counseling analytics grouped by college, program, and sex."

      />


      <div className="analytics-scope-card">

        <div>

          <strong>
            Analytics scope
          </strong>

          <span>
            {analyticsScope}
          </span>

        </div>


        <small>
          Live Firestore data · Generated {generatedAt}
        </small>

      </div>


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
          title="Scheduled counseling"
          value={
            scheduledSessions
          }
          icon={
            <Clock3 />
          }
        />


        <Stat
          title="Critical priority"
          value={
            priorityTotals.Critical ||
            0
          }
          icon={
            <AlertTriangle />
          }
          danger
        />


        <Stat
          title="High priority"
          value={
            priorityTotals.High ||
            0
          }
          icon={
            <Activity />
          }
          warning
        />


        <Stat
          title="Moderate priority"
          value={
            priorityTotals.Moderate ||
            0
          }
          icon={
            <ClipboardList />
          }
          warning
        />


        <Stat
          title="Low priority"
          value={
            priorityTotals.Low ||
            0
          }
          icon={
            <CheckCircle2 />
          }
        />

      </div>


      <div className="analytics-section-heading">

        <h2>
          Assessment Case Analytics
        </h2>

        <p>
          Priority levels are counted from psychological assessment cases.
        </p>

      </div>


      <AnalyticsBarChart
        title="Assessment priorities by college / office"
        subtitle="Low, Moderate, High, and Critical assessment cases for each college or office."
        rows={priorityByCollege}
        series={prioritySeries}
        emptyText="No assessment cases are available for college-level analytics."
      />


      <AnalyticsBarChart
        title="Assessment priorities by program"
        subtitle="Priority distribution for each academic program. Accounts without a program are grouped as No program / N/A."
        rows={priorityByProgram}
        series={prioritySeries}
        emptyText="No assessment cases are available for program-level analytics."
      />


      <AnalyticsBarChart
        title="Assessment priorities by sex"
        subtitle="Priority distribution using the Male/Female value stored in the user's public account profile."
        rows={priorityBySex}
        series={prioritySeries}
        emptyText="No assessment cases are available for sex-level analytics."
      />


      <div className="analytics-section-heading">

        <h2>
          Counseling Analytics
        </h2>

        <p>
          Requests include every counseling request record. Scheduled counseling counts records currently marked Schedule for counseling.
        </p>

      </div>


      <AnalyticsBarChart
        title="Counseling by college / office"
        subtitle="Total counseling requests and scheduled counseling records for each college or office."
        rows={counselingByCollege}
        series={counselingSeries}
        emptyText="No counseling records are available for college-level analytics."
      />


      <AnalyticsBarChart
        title="Counseling by program"
        subtitle="Counseling requests and scheduled counseling records grouped by academic program."
        rows={counselingByProgram}
        series={counselingSeries}
        emptyText="No counseling records are available for program-level analytics."
      />


      <AnalyticsBarChart
        title="Counseling by sex"
        subtitle="Counseling requests and scheduled counseling records grouped by Male/Female account profile value."
        rows={counselingBySex}
        series={counselingSeries}
        emptyText="No counseling records are available for sex-level analytics."
      />


      <section className="panel analytics-print-actions">

        <button

          className="secondary-button"

          onClick={
            () =>
              window.print()
          }

        >
          Print analytics
        </button>

      </section>


      {isSuperAdmin && (
        <FeedbackAnalytics />
      )}

    </div>

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
                    <RoleProtected
                      allowedRoles={GENERAL_USER_ROLE_VALUES}
                    >
                      <Assessment />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/monitoring"

                  element={
                    <RoleProtected
                      allowedRoles={GENERAL_USER_ROLE_VALUES}
                    >
                      <Monitoring />
                    </RoleProtected>
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
                    <RoleProtected
                      allowedRoles={GENERAL_USER_ROLE_VALUES}
                    >
                      <Consultations />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/referrals"

                  element={
                    <RoleProtected
                      allowedRoles={[...REFERRAL_USER_ROLE_VALUES, "counselor", "super_admin"]}
                    >
                      <Referrals />
                    </RoleProtected>
                  }

                />

                <Route

                  path="/feedback"

                  element={
                    <RoleProtected
                      allowedRoles={GENERAL_USER_ROLE_VALUES}
                    >
                      <Feedback />
                    </RoleProtected>
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
                    <RoleProtected
                      allowedRoles={["counselor", "super_admin"]}
                    >
                      <UserProfiles />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/history"

                  element={
                    <RoleProtected
                      allowedRoles={GENERAL_USER_ROLE_VALUES}
                    >
                      <History />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/cases"

                  element={
                    <RoleProtected
                      allowedRoles={["counselor", "super_admin"]}
                    >
                      <Cases />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/counseling-requests"

                  element={
                    <RoleProtected
                      allowedRoles={["counselor", "super_admin"]}
                    >
                      <CounselingRequestsManagement />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/schedule"

                  element={
                    <RoleProtected
                      allowedRoles={["counselor", "super_admin"]}
                    >
                      <Schedule />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/accounts"

                  element={
                    <RoleProtected
                      allowedRoles={["super_admin"]}
                    >
                      <Accounts />
                    </RoleProtected>
                  }

                />


                <Route

                  path="/reports"

                  element={
                    <RoleProtected
                      allowedRoles={["counselor", "super_admin"]}
                    >
                      <Reports />
                    </RoleProtected>
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