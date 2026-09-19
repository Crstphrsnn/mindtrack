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
  useNavigate
} from "react-router-dom";

import {
  AlertTriangle,
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
import "./counseling-calendar.css";

import {
  addRecord,
  subscribeCollection,
  updateRecord
} from "./services/dataService";

import {
  calculateAssessment,
  choices,
  questions
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
            Institutional Email

            <input
              value={email}
              onChange={
                e =>
                  setEmail(
                    e.target.value
                  )
              }
              type="email"
              name="mindtrack-login-email"
              autoComplete="off"
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
              autoComplete="new-password"
              required
            />
          </label>


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


function isValidStudentInstitutionalEmail(
  email
) {

  const cleanEmail =
    String(
      email || ""
    )
      .trim()
      .toLowerCase();


  return /^\d{2}ln\d{4}_ms@psu\.edu\.ph$/.test(
    cleanEmail
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
        "Please enter your institutional email address."
      );
      return;
    }

    if (
      !isInstitutionalEmail(
        form.email
      )
    ) {
      setError(
        "Please use your official PSU institutional email address ending in @psu.edu.ph."
      );
      return;
    }

    if (
      form.role === "student" &&
      !isValidStudentInstitutionalEmail(
        form.email
      )
    ) {
      setError(
        "Student institutional email must follow the format: 00ln0000_ms@psu.edu.ph."
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

    if (
      form.contactPersonPhone &&
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

          <div className="registration-section">

            <h2>
              Account Information
            </h2>


            <div className="registration-grid">

              <label>
                First Name

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
                Institutional Email

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={change}
                  placeholder="00ln0000_ms@psu.edu.ph"
                  autoComplete="email"
                  required
                />
              </label>


              <label>
                Account Type

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
              {" "}

              <span className="optional-text">
                (If applicable)
              </span>
            </h2>


            <div className="registration-grid">

              <label>
                Contact Person Name

                <input
                  type="text"
                  name="contactPersonName"
                  value={form.contactPersonName}
                  onChange={change}
                />
              </label>


              <label>
                Contact Person Phone Number

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


  const [notes, setNotes] =
    useState("");


  const [saved, setSaved] =
    useState(null);


  async function submit(e) {

    e.preventDefault();


    if (
      Object.keys(
        answers
      ).length !==
      questions.length
    ) {

      alert(
        "Please answer every question."
      );

      return;

    }


    const result =
      calculateAssessment(
        answers
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

      answers,

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
          `Your monitoring result is ${result.priority} priority.`,

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

      <div className="result-card">

        <CheckCircle2
          size={58}
        />


        <h1>
          Assessment submitted
        </h1>


        <div
          className={
            `priority big ${saved.priority.toLowerCase()}`
          }
        >
          {saved.priority}
        </div>


        <h2>
          Monitoring score:
          {" "}
          {saved.score}/100
        </h2>


        <p>
          {saved.recommendation}
        </p>


        <div className="notice">

          This is a screening and decision-support result only.
          It is not a medical diagnosis.

        </div>


        {saved.safetyFlag && (

          <div className="critical-notice">

            A counselor should review this submission immediately.
            For immediate danger, contact local emergency services
            or a trusted person nearby.

          </div>

        )}

      </div>

    );

  }


  return (

    <>

      <PageTitle

        title="Psychological Assessment"

        subtitle="Answer honestly. Your responses are confidential and used for monitoring and counseling support."

      />


      <form
        className="panel assessment-form"
        onSubmit={submit}
      >


        {questions.map(
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


              <div className="choice-row">


                {choices.map(
                  choice => (

                    <label

                      key={
                        choice.value
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

                        onChange={
                          () =>
                            setAnswers(
                              current => ({
                                ...current,

                                [
                                  question.id
                                ]:
                                  choice.value
                              })
                            )
                        }

                      />

                      {choice.label}

                    </label>

                  )
                )}

              </div>

            </div>

          )
        )}


        <label>

          Additional notes

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


        <button className="primary-button">

          Submit assessment

        </button>


      </form>

    </>

  );
}


// ======================================================
// COUNSELING DATE AVAILABILITY
// ======================================================

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


    if (!form.time) {

      alert(
        "Please select your preferred counseling time."
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
        row.time ||
        "",

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


    if (!editForm.time) {

      alert(
        "Please select your preferred counseling time."
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
                Choose
              </option>

              <option>
                9:00 AM
              </option>

              <option>
                10:30 AM
              </option>

              <option>
                1:30 PM
              </option>

              <option>
                3:00 PM
              </option>

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
                                  Choose
                                </option>

                                <option>
                                  9:00 AM
                                </option>

                                <option>
                                  10:30 AM
                                </option>

                                <option>
                                  1:30 PM
                                </option>

                                <option>
                                  3:00 PM
                                </option>

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
      form.contactPersonPhone &&
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
              {" "}

              <span className="optional-text">
                (If applicable)
              </span>

            </h2>


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

            ? "Filter users by college/office and student program, then open a profile for read-only viewing."

            : `Filter users from ${currentUser.department} by student program, then open a profile for read-only viewing.`
        }

      />


      <div className="readonly-access-notice">

        <strong>
          Read-only access
        </strong>

        <span>
          Counselors and Super Admin can view user profile information, but they cannot edit or save changes to these profiles.
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


        <section className="panel readonly-profile-panel">

          {!selected

            ? (

              <Empty
                text="Select a user to view their profile."
              />

            )

            : (

              <>

                <div className="readonly-profile-header">

                  <div
                    className="profile-avatar"
                    aria-hidden="true"
                  >

                    {
                      selected.name
                        ?.trim()
                        ?.charAt(0)
                        ?.toUpperCase() ||
                      "U"
                    }

                  </div>


                  <div>

                    <h2>
                      {
                        displayValue(
                          selected.name
                        )
                      }
                    </h2>

                    <p>
                      {
                        displayValue(
                          selected.email
                        )
                      }
                    </p>

                    <span className="profile-role-badge">
                      {
                        displayRole(
                          selected.role
                        )
                      }
                    </span>

                  </div>

                </div>


                <div className="readonly-profile-grid">


                  <div className="readonly-profile-item">

                    <span>
                      Full Name
                    </span>

                    <strong>
                      {
                        displayValue(
                          selected.name
                        )
                      }
                    </strong>

                  </div>


                  <div className="readonly-profile-item">

                    <span>
                      Email
                    </span>

                    <strong>
                      {
                        displayValue(
                          selected.email
                        )
                      }
                    </strong>

                  </div>


                  <div className="readonly-profile-item">

                    <span>
                      Account Type
                    </span>

                    <strong>
                      {
                        displayRole(
                          selected.role
                        )
                      }
                    </strong>

                  </div>


                  <div className="readonly-profile-item">

                    <span>
                      College / Office
                    </span>

                    <strong>
                      {
                        displayValue(
                          selected.department
                        )
                      }
                    </strong>

                  </div>


                  {selected.role ===
                    "student" && (

                    <div className="readonly-profile-item full">

                      <span>
                        Program
                      </span>

                      <strong>
                        {
                          displayValue(
                            selected.program
                          )
                        }
                      </strong>

                    </div>

                  )}


                  <div className="readonly-profile-item">

                    <span>
                      {
                        selected.role ===
                        "student"
                          ? "Student Number"
                          : "Employee Number"
                      }
                    </span>

                    <strong>
                      {
                        displayValue(
                          selected.userNumber
                        )
                      }
                    </strong>

                  </div>


                  <div className="readonly-profile-item">

                    <span>
                      Phone Number
                    </span>

                    <strong>
                      {
                        displayValue(
                          selected.phoneNumber
                        )
                      }
                    </strong>

                  </div>


                  <div className="readonly-profile-item full">

                    <span>
                      Address
                    </span>

                    <strong>
                      {
                        displayValue(
                          selected.address
                        )
                      }
                    </strong>

                  </div>


                  <div className="readonly-profile-item">

                    <span>
                      Facebook Account
                    </span>

                    <strong>
                      {
                        displayValue(
                          selected.facebookAccount
                        )
                      }
                    </strong>

                  </div>


                  <div className="readonly-profile-item">

                    <span>
                      Contact Person
                    </span>

                    <strong>
                      {
                        displayValue(
                          selected.contactPersonName
                        )
                      }
                    </strong>

                  </div>


                  <div className="readonly-profile-item">

                    <span>
                      Contact Person Phone
                    </span>

                    <strong>
                      {
                        displayValue(
                          selected.contactPersonPhone
                        )
                      }
                    </strong>

                  </div>

                </div>


                <div className="profile-note">

                  This profile is view-only. Counselor and Super Admin accounts cannot modify this user's information.

                </div>

              </>

            )
          }

        </section>

      </div>

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
          Consultations
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


  const [selected, setSelected] =
    useState(null);


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


      <div className="case-layout">


        <section className="panel">

          <h2>
            Assessment Cases
          </h2>


          <CaseTable

            rows={rows}

            onSelect={
              setSelected
            }

          />

        </section>


        <section className="panel detail-panel">


          {!selected

            ? (

              <Empty
                text="Select an assessment case to review."
              />

            )

            : (

              <>

                <h2>
                  {
                    selected.ownerName
                  }
                </h2>


                <div
                  className={
                    `priority ${String(
                      selected.priority
                    ).toLowerCase()}`
                  }
                >

                  {
                    selected.priority
                  }

                </div>


                <p>

                  <b>
                    Score:
                  </b>

                  {" "}

                  {
                    selected.score
                  }/100

                </p>


                <p>

                  <b>
                    Department:
                  </b>

                  {" "}

                  {
                    selected.department
                  }

                </p>


                <p>

                  <b>
                    System recommendation:
                  </b>

                  {" "}

                  {
                    selected.recommendation
                  }

                </p>


                <label>

                  Counselor remarks

                  <textarea

                    id="remarks"

                    rows="5"

                    defaultValue={
                      selected.counselorRemarks ||
                      ""
                    }

                  />

                </label>


                <label>

                  Status

                  <select

                    id="caseStatus"

                    defaultValue={
                      selected.status ||
                      "For review"
                    }

                  >

                    <option>
                      For review
                    </option>

                    <option>
                      Contacted
                    </option>

                    <option>
                      Scheduled
                    </option>

                    <option>
                      Under intervention
                    </option>

                    <option>
                      Follow-up
                    </option>

                    <option>
                      Closed
                    </option>

                  </select>

                </label>


                <button

                  className="primary-button"

                  onClick={
                    async () => {

                      const remarks =
                        document
                          .getElementById(
                            "remarks"
                          )
                          .value;


                      const status =
                        document
                          .getElementById(
                            "caseStatus"
                          )
                          .value;


                      await updateRecord(
                        "assessments",
                        selected.id,
                        {
                          counselorRemarks:
                            remarks,

                          status
                        }
                      );


                      setSelected({

                        ...selected,

                        counselorRemarks:
                          remarks,

                        status

                      });

                    }
                  }

                >

                  Save case update

                </button>

              </>

            )
          }

        </section>

      </div>

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

    setStatusDraft(
      row.status ||
      "Pending approval"
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


      setSelected({
        ...selected,

        status:
          statusDraft,

        counselorRemarks:
          remarksDraft
      });


      alert(
        "Counseling request updated successfully."
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


      <div className="case-layout">


        <section className="panel">

          <h2>
            Request List
          </h2>


          {rows.length === 0

            ? (

              <Empty
                text="No counseling requests."
              />

            )

            : rows.map(
                row => (

                  <article

                    className="record-card"

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

                      {row.mode && (
                        <>
                          {" · "}
                          {row.mode}
                        </>
                      )}
                    </small>


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


        <section className="panel detail-panel">


          {!selected

            ? (

              <Empty
                text="Select a counseling request to review."
              />

            )

            : (

              <>

                <h2>
                  {
                    selected.ownerName ||
                    "User"
                  }
                </h2>


                <p>

                  <b>
                    Concern:
                  </b>

                  {" "}

                  {
                    selected.category ||
                    "Not provided"
                  }

                </p>


                <p>

                  <b>
                    Department:
                  </b>

                  {" "}

                  {
                    selected.department ||
                    "Not provided"
                  }

                </p>


                {selected.mode && (

                  <p>

                    <b>
                      Mode:
                    </b>

                    {" "}

                    {
                      selected.mode
                    }

                  </p>

                )}


                <p>

                  <b>
                    Preferred schedule:
                  </b>

                  {" "}

                  {
                    selected.date ||
                    "No date"
                  }

                  {" · "}

                  {
                    selected.time ||
                    "No time"
                  }

                </p>


                <p>

                  <b>
                    Details:
                  </b>

                  {" "}

                  {
                    selected.message ||
                    "No additional details."
                  }

                </p>


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
                      Pending approval
                    </option>

                    <option>
                      Approved
                    </option>

                    <option>
                      Rescheduled
                    </option>

                    <option>
                      Completed
                    </option>

                    <option>
                      Cancelled
                    </option>

                  </select>

                </label>


                <label>

                  Counselor remarks

                  <textarea

                    rows="5"

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

              </>

            )
          }

        </section>

      </div>

    </>

  );
}


// ======================================================
// COUNSELOR SCHEDULE
// ======================================================

function Schedule() {

  const { user } =
    useAuth();


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


  return (

    <>

      <PageTitle

        title="Counselor Schedule"

        subtitle="Approved, pending, and completed counseling appointments."

      />


      <section className="panel">

        <div className="schedule-grid">


          {rows.length === 0

            ? (

              <Empty
                text="No appointments yet."
              />

            )

            : rows.map(
                row => (

                  <article

                    className="schedule-card"

                    key={
                      row.id
                    }

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
                          row.ownerName
                        }

                        {row.mode && (
                          <>
                            {" · "}
                            {row.mode}
                          </>
                        )}

                      </p>


                      <span className="status">

                        {
                          row.status
                        }

                      </span>

                    </div>

                  </article>

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

          title="Closed cases"

          value={
            assessments.filter(
              assessment =>
                assessment.status ===
                "Closed"
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
  onSelect
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

            <th>
              Score
            </th>

            <th>
              Priority
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
            row => (

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


                <td>

                  {
                    row.score ??
                    "—"
                  }

                </td>


                <td>

                  <span
                    className={
                      `priority ${
                        String(
                          row.priority
                        ).toLowerCase()
                      }`
                    }
                  >

                    {
                      row.priority
                    }

                  </span>

                </td>


                <td>
                  {
                    row.status
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

            )
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