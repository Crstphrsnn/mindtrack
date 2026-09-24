import React, { useEffect, useState } from "react";
import psuLogo from "./assets/psu-logo.jpg";

import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
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
  subscribeCollection,
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
    : <Navigate to="/login" replace />;
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
    userNumber: "",
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
          program:
            nextValue === "student"
              ? current.program
              : ""
        };
      }


      if (name === "department") {

        return {
          ...current,
          department: nextValue,
          program: ""
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

    if (!form.department) {
      setError(
        "Please select your college or office."
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
        userNumber: form.userNumber,
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

                  <option value="faculty">
                    Faculty
                  </option>

                  <option value="personnel">
                    Personnel
                  </option>

                </select>
              </label>


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
                  : form.role === "faculty" ||
                      form.role === "personnel"
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


  useEffect(
    () =>
      subscribeCollection(
        name,
        setRows,
        filters
      ),

    [
      name,
      filters.ownerId,
      filters.department
    ]
  );


  return rows;
}


// ======================================================
// DASHBOARD ACCESS
// Student / Faculty / Personnel do not use Dashboard.
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


        <section className="panel">

          <h2>
            Recent priority cases
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


          {[
            "faculty",
            "personnel"
          ].includes(
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
        "WHO5-PHQ9-GAD7-DASS21-2026-09",

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


    await addRecord(
      "notifications",
      {

        ownerId:
          user.id,

        title:
          "Assessment submitted",

        message:
          `Your psychological assessment was submitted. MindTrack monitoring priority: ${result.priority}.`,

        targetPath:
          "/monitoring",

        sourceType:
          "assessment",

        read:
          false

      }
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

          <section className="assessment-result-item">

            <span>
              DASS-21
            </span>

            <strong>
              {
                saved.instrumentResults
                  .dass21
                  .totalScore
              }/63
            </strong>

            <small>
              Project raw total
            </small>

            <p>
              Sum of all 21 responses using the requested 0-3 scoring rule.
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

        subtitle="Complete all four screening tools. Each section has its own title, questions, response scale, and scoring method."

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


            <div className="assessment-score-range">
              Score: 0-25 raw / 0-100 percentage
            </div>

          </div>


          <p className="assessment-instructions">

            Think about the last two weeks. For each statement,
            choose the answer that is closest to how often you felt that way.
            Higher numbers mean better well-being.

          </p>


          {
            renderInstrumentQuestions(
              who5Questions,
              who5Choices
            )
          }


          <div className="assessment-source-note">

            Scoring: add the five responses for a raw score from
            0 to 25, then multiply the raw score by 4 for a
            percentage score from 0 to 100. A percentage below
            50, or raw score below 13, is the WHO-5 suggested
            cut-off for poor mental well-being and further assessment.

            <br />
            <br />

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


            <div className="assessment-score-range">
              Total score: 0-27
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

            Scoring: add the scores of items 1-9.
            The functional difficulty question is recorded
            separately and is not included in the PHQ-9 total.

            <br />
            <br />

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


            <div className="assessment-score-range">
              Total score: 0-21
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

            Scoring: add the scores of items 1-7 for a total
            from 0 to 21.

            <br />
            <br />

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


            <div className="assessment-score-range">
              Project total: 0-63
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

            Project scoring rule: each item is scored from 0 to 3,
            then all 21 item scores are added for a total from 0 to 63.
            This follows your requested PHQ-9-style summation method.

            <br />
            <br />

            The provided DASS-21 page lists the 21 questions and
            0-3 response scale, but it does not provide a severity
            interpretation formula. MindTrack therefore stores the
            total score without assigning a DASS-21 severity category.

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


function generalUserRole(
  role
) {

  return [
    "student",
    "faculty",
    "personnel"
  ].includes(role);
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


  const rows =
    useRows(
      "consultations",
      {
        ownerId:
          user.id
      }
    );


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

      await addRecord(
        "consultations",
        {

          ...form,

          ownerId:
            user.id,

          ownerName:
            user.name,

          department:
            user.department,

          program:
            user.program || "",

          status:
            "Pending approval",

          source:
            "Self-request"

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


      await updateRecord(
        "consultations",
        row.id,
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
            "Pending approval"

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
                      selectedDate
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
                  >
                    {time}
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
                    ![
                      "Completed",
                      "Cancelled"
                    ].includes(
                      row.status
                    );


                  return (

                    <article

                      className="record-card"

                      key={
                        row.id
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
                                        selectedDate
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
                                    >
                                      {time}
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

        subtitle="Faculty and personnel may refer someone who may benefit from guidance support."

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
                Faculty
              </option>

              <option>
                Personnel
              </option>

            </select>

          </label>


          <label>

            College / Office

            <input

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

            />

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
// STUDENT / FACULTY / PERSONNEL
// ======================================================

function Feedback() {

  const { user } =
    useAuth();


  const allowedRoles = [
    "student",
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
    "faculty",
    "personnel"
  ];

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
              user.role ===
              "student"

                ? "Student"

                : user.role ===
                  "faculty"

                  ? "Faculty"

                  : "Personnel"
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
                  user.role ===
                  "student"

                    ? "Student"

                    : user.role ===
                      "faculty"

                      ? "Faculty"

                      : "Personnel"
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


  const [rows, setRows] =
    useState([]);


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


            data.sort(
              (a, b) =>
                String(
                  a.name || ""
                ).localeCompare(
                  String(
                    b.name || ""
                  )
                )
            );


            setRows(data);
            setLoadingUsers(false);
          },

          error => {

            console.error(
              "Unable to load user profiles:",
              error
            );


            setRows([]);


            setUsersError(
              error?.code ===
              "permission-denied"

                ? "Firestore denied access to the users collection. Check the account role and department access."

                : (
                    error?.message ||
                    "Unable to load user profiles."
                  )
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


  const users =
    rows.filter(
      account => {

        const role =
          String(
            account.role || ""
          )
            .trim()
            .toLowerCase();


        return [
          "student",
          "faculty",
          "personnel"
        ].includes(role);
      }
    );


  const [selected, setSelected] =
    useState(null);


  const [
    selectedCollege,
    setSelectedCollege
  ] = useState(
    isSuperAdmin
      ? "All Colleges / Offices"
      : currentUser.department
  );


  const [
    selectedProgram,
    setSelectedProgram
  ] = useState("All Programs");


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
    users.filter(
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


        return (
          collegeMatches &&
          programMatches
        );
      }
    );


  function changeCollegeFilter(
    value
  ) {

    setSelectedCollege(value);
    setSelectedProgram(
      "All Programs"
    );
    setSelected(null);
  }


  function changeProgramFilter(
    value
  ) {

    setSelectedProgram(value);
    setSelected(null);
  }


  function displayRole(role) {

    if (role === "student") {
      return "Student";
    }

    if (role === "faculty") {
      return "Faculty";
    }

    if (role === "personnel") {
      return "Personnel";
    }

    return role || "—";
  }


  function displayValue(value) {

    const clean =
      String(
        value || ""
      ).trim();


    return clean ||
      "Not provided";
  }


  return (

    <>

      <PageTitle

        title="User Profiles"

        subtitle={
          isSuperAdmin

            ? "Filter users by college/office and student program, then open the complete user profile."

            : `Filter users from ${currentUser.department} by student program, then open the complete user profile.`
        }

      />


      <div className="readonly-access-notice">

        <strong>
          Profile access
        </strong>

        <span>
          User profile information is read-only. Counseling notes can only be edited by the assigned counselor or the Super Admin.
        </span>

      </div>


      <section className="panel profile-filter-panel">

        <div className="profile-filter-heading">

          <div>
            <h2>
              Find Users
            </h2>

            <p>
              Use the filters below to narrow the list without changing any account information.
            </p>
          </div>

          <span className="profile-result-count">
            {visibleUsers.length} result{visibleUsers.length === 1 ? "" : "s"}
          </span>

        </div>


        <div className="profile-filter-grid">

          {isSuperAdmin && (

            <label>
              College / Office

              <select
                value={selectedCollege}
                onChange={
                  e =>
                    changeCollegeFilter(
                      e.target.value
                    )
                }
              >

                <option>
                  All Colleges / Offices
                </option>


                {collegeOptions.map(
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
              value={selectedProgram}
              onChange={
                e =>
                  changeProgramFilter(
                    e.target.value
                  )
              }
            >

              <option>
                All Programs
              </option>


              {programOptions.map(
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

        </div>

      </section>


      <div className="user-profile-view-layout">


        <section className="panel">

          <div className="user-list-heading">

            <div>

              <h2>
                User List
              </h2>

              <p>
                Student programs are shown when available.
              </p>

            </div>

          </div>


          {loadingUsers

            ? (

              <Empty
                text="Loading user profiles..."
              />

            )

            : usersError

              ? (

                <div className="error-box">
                  {usersError}
                </div>

              )

              : visibleUsers.length === 0

                ? (

                  <Empty
                    text="No users match the selected filters."
                  />

                )

                : (

                  <div className="table-wrap">

                    <table>

                      <thead>

                        <tr>

                          <th>
                            Name
                          </th>

                          <th>
                            Role
                          </th>

                          <th>
                            College / Office
                          </th>

                          <th>
                            Program
                          </th>

                          <th>
                            Student / Employee No.
                          </th>

                          <th>
                            Action
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {visibleUsers.map(
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
                                  displayRole(
                                    account.role
                                  )
                                }
                              </td>

                              <td>
                                {
                                  account.department ||
                                  "—"
                                }
                              </td>

                              <td>
                                {
                                  account.role ===
                                    "student"
                                    ? (
                                        account.program ||
                                        "Not provided"
                                      )
                                    : "—"
                                }
                              </td>

                              <td>
                                {
                                  account.userNumber ||
                                  "—"
                                }
                              </td>

                              <td>

                                <button
                                  type="button"
                                  className="text-button"
                                  onClick={
                                    () =>
                                      setSelected(
                                        account
                                      )
                                  }
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

                )
          }

        </section>


      </div>


      {selected && (

        <UserProfileFullScreen
          profile={selected}
          currentUser={currentUser}

          onClose={
            () =>
              setSelected(null)
          }

          displayRole={
            displayRole
          }

          displayValue={
            displayValue
          }
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


  const rows =
    useRows(
      "notifications",
      {
        ownerId:
          user.id
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

        subtitle="Updates about your psychological assessment cases and counseling requests."

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


                      <small>
                        {
                          formatRecordDateTime(
                            row.createdAt
                          )
                        }
                      </small>

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


  const assessments =
    useRows(
      "assessments",
      {
        ownerId:
          user.id
      }
    );


  const latest =
    assessments[0] ||
    null;


  const latestResults =
    latest?.instrumentResults ||
    null;


  return (

    <>

      <PageTitle

        title="Mental Health Monitoring"

        subtitle="Review your latest screening results and previous assessment records."

      />


      {!latest

        ? (

          <section className="panel monitoring-empty-panel">

            <Activity
              size={42}
            />

            <h2>
              No assessment data yet
            </h2>

            <p>
              Complete a psychological assessment first so MindTrack can display your monitoring information.
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

        : (

          <>

            <section className="panel monitoring-summary-panel">

              <div className="monitoring-summary-header">

                <div>

                  <span className="monitoring-kicker">
                    Current Monitoring State
                  </span>

                  <h2>
                    Based on your latest assessment
                  </h2>

                  <p>
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
                      latest.status ||
                      "For review"
                    }
                  </strong>

                </div>


                <div className="monitoring-status-item">

                  <span>
                    Assessment Version
                  </span>

                  <strong>
                    {
                      latest.assessmentVersion ||
                      "Legacy assessment"
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


                  <article className="panel monitoring-score-card">

                    <span>
                      DASS-21
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
                      Project raw total
                    </small>

                  </article>

                </section>

              )

              : (

                <section className="panel">

                  <div className="notice">
                    This is an older assessment record. Detailed WHO-5, PHQ-9, GAD-7, and DASS-21 results are not available for this record.
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
                    Assessment Monitoring History
                  </h2>

                  <p>
                    Newest assessment first.
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

                {assessments.map(
                  row => (

                    <article

                      key={
                        row.id
                      }

                      className="monitoring-history-card"

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
                            row.status ||
                            "For review"
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

                        <span>
                          DASS-21:
                          {" "}
                          {
                            row.instrumentResults
                              ?.dass21
                              ?.totalScore ??
                            "—"
                          }
                        </span>

                      </div>

                    </article>

                  )
                )}

              </div>

            </section>

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


  const rows =
    useRows(
      "assessments",
      assessmentFilters
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
        rows.map(
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
    rows.filter(
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
    rows.filter(
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


  const [selected, setSelected] =
    useState(null);


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
    "Schedule for counseling",
    "Follow up is recommended",
    "Counseling is optional",
    "For referral"
  ];


  function selectAssessmentCase(
    row
  ) {

    setSelected(row);


    setStatusDraft(
      assessmentStatuses.includes(
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

          setSelected(null);
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


      await updateRecord(
        "assessments",
        selected.id,
        {
          counselorRemarks:
            remarksDraft,

          status:
            statusDraft
        }
      );


      let notificationSent =
        true;


      if (
        assessmentChanged &&
        selected.ownerId
      ) {

        try {

          await addRecord(
            "notifications",
            {

              ownerId:
                selected.ownerId,

              title:
                "Assessment case updated",

              message:
                `Your psychological assessment case was updated. Status: ${statusDraft}.${remarksDraft.trim() ? " A counselor remark is available." : ""}`,

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


      setSelected({
        ...selected,

        counselorRemarks:
          remarksDraft,

        status:
          statusDraft
      });


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


  return (

    <>

      <PageTitle

        title={
          isSuperAdmin
            ? "All Psychological Assessment Cases"
            : "Psychological Assessment Cases"
        }

        subtitle="Review psychological assessment results and update intervention status."

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
                  ? "Filter cases by college, program, and monitoring priority."
                  : "Filter cases by program and monitoring priority."
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
              rows.length
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


        <CaseTable

          rows={
            filteredCaseRows
          }

          onSelect={
            selectAssessmentCase
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

                setSelected(null);
              }
            }
          }

        >

          <section

            className="review-request-modal"

            role="dialog"

            aria-modal="true"

            aria-label={
              `Review psychological assessment for ${
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
                      `priority ${
                        String(
                          selected.priority ||
                          ""
                        ).toLowerCase()
                      }`
                    }
                  >

                    {
                      selected.priority ||
                      "No priority"
                    }

                  </span>

                </div>


                <p className="review-request-modal-subtitle">
                  Review the assessment result, recommendation, status,
                  and counselor remarks.
                </p>

              </div>


              <button

                type="button"

                className="review-request-close-button"

                onClick={
                  () =>
                    setSelected(null)
                }

                aria-label="Close psychological assessment review"

                title="Close"

              >
                ×
              </button>

            </header>


            <div className="review-request-modal-body">

              <section className="review-request-modal-card">

                <h3>
                  Assessment Details
                </h3>


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

                        <div className="review-request-detail-item">

                          <span>
                            DASS-21
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
                            Project raw total
                          </small>

                        </div>

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


              <section className="review-request-modal-card review-request-update-card">

                <h3>
                  Counselor Review
                </h3>


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

                  </select>

                </label>


                <label>

                  Counselor remarks

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

                    placeholder="Add counselor remarks, recommendations, or instructions."

                  />

                </label>


                <div className="review-request-modal-actions">

                  <button

                    type="button"

                    className="secondary-button"

                    onClick={
                      () =>
                        setSelected(null)
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


  const consultationFilters =
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
          };


  const rows =
    useRows(
      "consultations",
      consultationFilters
    );


  const assessmentRows =
    useRows(
      "assessments",
      consultationFilters
    );


  const latestAssessmentByOwner =
    {};


  assessmentRows.forEach(
    assessment => {

      const ownerId =
        assessment.ownerId;


      if (
        ownerId &&
        !latestAssessmentByOwner[
          ownerId
        ]
      ) {

        latestAssessmentByOwner[
          ownerId
        ] = assessment;
      }
    }
  );


  const enrichedRows =
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
    saving,
    setSaving
  ] = useState(false);


  useEffect(
    () => {

      if (!selected) {
        return undefined;
      }


      const previousOverflow =
        document.body.style.overflow;


      function closeOnEscape(event) {

        if (event.key === "Escape") {
          setSelected(null);
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


  const requestedRequestId =
    location.state
      ?.requestId ||
    "";


  useEffect(
    () => {

      if (!requestedRequestId) {
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


      const allowedReviewStatuses = [
        "For review",
        "Schedule for counseling",
        "Follow up is recommended",
        "Counseling is optional",
        "For referral"
      ];


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


      navigate(
        location.pathname,
        {
          replace: true,
          state: {}
        }
      );

    },

    [
      requestedRequestId,
      rows,
      assessmentRows,
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

    setSelected(row);

    const allowedReviewStatuses = [
      "For review",
      "Schedule for counseling",
      "Follow up is recommended",
      "Counseling is optional",
      "For referral"
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


  async function saveRequestUpdate() {

    if (!selected) {
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


      await updateRecord(
        "consultations",
        selected.id,
        {
          status:
            statusDraft,

          counselorRemarks:
            remarksDraft
        }
      );


      let notificationSent =
        true;


      if (
        requestChanged &&
        selected.ownerId
      ) {

        try {

          await addRecord(
            "notifications",
            {

              ownerId:
                selected.ownerId,

              title:
                "Counseling request updated",

              message:
                `Your counseling request was updated. Status: ${statusDraft}.${remarksDraft.trim() ? " A counselor remark is available." : ""}`,

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
                      Review request
                    </button>

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

                setSelected(null);
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
                  () =>
                    setSelected(null)
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


                <label>

                  Status

                  <select

                    value={
                      statusDraft
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

                  </select>

                </label>


                <label>

                  Counselor remarks

                  <textarea

                    rows="9"

                    value={
                      remarksDraft
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


                <div className="review-request-modal-actions">

                  <button

                    type="button"

                    className="secondary-button"

                    onClick={
                      () =>
                        setSelected(null)
                    }

                  >
                    Close
                  </button>


                  <button

                    type="button"

                    className="primary-button"

                    disabled={
                      saving
                    }

                    onClick={
                      saveRequestUpdate
                    }

                  >

                    {
                      saving
                        ? "Saving..."
                        : "Save request update"
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


  const consultationFilters =
    isSuperAdmin
      ? {}
      : {
          department:
            user.department
        };


  const rows =
    useRows(
      "consultations",
      consultationFilters
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
            appointment.id
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

        subtitle="Super Admin overview of students, faculty, personnel, counselors, and administrators."

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
                        account.role
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
            Summary of feedback submitted by Student, Faculty, and Personnel users.
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
                                      item.role ||
                                      "—"
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


  const filters =
    isSuperAdmin
      ? {}
      : {
          department:
            user.department
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


  const counts =
    [
      "Low",
      "Moderate",
      "High",
      "Critical"
    ].map(
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


  return (

    <>

      <PageTitle

        title="Reports and Analytics"

        subtitle="Live operational totals from current records."

      />


      <div className="stat-grid">


        <Stat

          title="Assessments"

          value={
            assessments.length
          }

          icon={
            <ClipboardList />
          }

        />


        <Stat

          title="Consultations"

          value={
            consultations.length
          }

          icon={
            <Calendar />
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


      <section className="panel">

        <h2>
          Priority breakdown
        </h2>


        <div className="bar-list">


          {counts.map(
            item => (

              <div
                key={
                  item.priority
                }
              >

                <span>
                  {
                    item.priority
                  }
                </span>


                <div className="bar">

                  <i
                    style={{
                      width:
                        `${
                          assessments.length

                            ? (
                                item.count /
                                assessments.length
                              ) * 100

                            : 0
                        }%`
                    }}
                  />

                </div>


                <b>
                  {
                    item.count
                  }
                </b>

              </div>

            )
          )}

        </div>


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
                        <>
                          {
                            row.instrumentResults
                              ?.dass21
                              ?.totalScore
                          }/63
                        </>
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
                      row.status ||
                      "For review"
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