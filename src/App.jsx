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
  Shield,
  Star,
  UserPlus
} from "lucide-react";

import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";

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
// LOGIN
// ======================================================

function Login() {
  const {
    user,
    login,
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


  if (user) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  async function submit(e) {
    e.preventDefault();

    setError("");
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
                e =>
                  setEmail(
                    e.target.value
                  )
              }
              type="email"
              name="mindtrack-login-email"
              placeholder="Enter your email"
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
function Register() {
  const {
    register,
    firebaseEnabled
  } = useAuth();

  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
    userNumber: "",
    phoneNumber: "",
    address: "",
    facebookAccount: "",
    contactPersonName: "",
    contactPersonPhone: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function change(e) {
    const { name, value } = e.target;

    const numericFields = [
      "phoneNumber",
      "contactPersonPhone"
    ];

    const nextValue =
      numericFields.includes(name)
        ? value.replace(/\D/g, "")
        : value;

    setForm(current => ({
      ...current,
      [name]: nextValue
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!form.role) {
      setError("Please select your account type.");
      return;
    }

    if (!form.department) {
      setError("Please select your college or office.");
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
      setError("Please enter your phone number.");
      return;
    }

    if (!form.address.trim()) {
      setError("Please enter your address.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        department: form.department,
        userNumber: form.userNumber,
        phoneNumber: form.phoneNumber,
        address: form.address,
        facebookAccount: form.facebookAccount,
        contactPersonName: form.contactPersonName,
        contactPersonPhone: form.contactPersonPhone
      });

      alert(
        "Registration successful! Please login using your new account."
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
          "This email address is already registered."
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
                Full Name

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={change}
                  required
                />
              </label>

              <label>
                Email

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={change}
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
                  pattern="[0-9]*"
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

              <label className="full-width-field">
                Address

                <textarea
                  name="address"
                  rows="3"
                  value={form.address}
                  onChange={change}
                  placeholder="Enter your complete address"
                  required
                />
              </label>

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
                  pattern="[0-9]*"
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
            disabled={loading}
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

        subtitle="Your private wellness and counseling dashboard"

      />


      <div className="stat-grid">

        <Stat
          title="Assessments"
          value={
            ownAssessments.length
          }
          icon={
            <ClipboardList />
          }
        />


        <Stat
          title="Consultations"
          value={
            ownConsultations.length
          }
          icon={
            <Calendar />
          }
        />


        <Stat
          title="Referrals submitted"
          value={
            referrals.filter(
              r =>
                r.referrerId ===
                user.id
            ).length
          }
          icon={
            <UserPlus />
          }
        />


        <Stat
          title="Latest priority"
          value={
            ownAssessments[0]
              ?.priority ||
            "None"
          }
          icon={
            <Shield />
          }
        />

      </div>


      <section className="panel">

        <h2>
          Quick start
        </h2>


        <div className="action-grid">

          <ActionLink
            href="/assessment"
            title="Take assessment"
            text="Complete the guided psychological screening."
          />


          <ActionLink
            href="/consultations"
            title="Request counseling"
            text="Choose a preferred schedule and counseling mode."
          />


          {[
            "faculty",
            "personnel"
          ].includes(
            user.role
          ) && (

            <ActionLink
              href="/referrals"
              title="Submit referral"
              text="Refer a student or employee while respecting confidentiality."
            />

          )}

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


  const [form, setForm] =
    useState({

      mode:
        "Face-to-face",

      date:
        "",

      time:
        "",

      category:
        "Academic concern",

      message:
        ""

    });


  async function submit(e) {

    e.preventDefault();


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

        status:
          "Pending approval",

        source:
          "Self-request"

      }
    );


    setForm({

      mode:
        "Face-to-face",

      date:
        "",

      time:
        "",

      category:
        "Academic concern",

      message:
        ""

    });

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

              onChange={
                e =>
                  setForm({
                    ...form,
                    mode:
                      e.target.value
                  })
              }

            >

              <option>
                Face-to-face
              </option>

              <option>
                Online
              </option>

              <option>
                Follow-up
              </option>

            </select>

          </label>


          <label>

            Preferred date

            <input

              type="date"

              required

              value={
                form.date
              }

              onChange={
                e =>
                  setForm({
                    ...form,
                    date:
                      e.target.value
                  })
              }

            />

          </label>


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

            Message

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


          {rows.length === 0

            ? (

              <Empty
                text="No consultation request yet."
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
                      {row.category}
                    </strong>

                    <span className="status">
                      {row.status}
                    </span>


                    <p>

                      {row.date}
                      {" · "}
                      {row.time}
                      {" · "}
                      {row.mode}

                    </p>


                    {row.counselorRemarks && (

                      <small>

                        Counselor:
                        {" "}
                        {
                          row.counselorRemarks
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

            Account type, college/office, email, and student/employee number are locked here to protect account and department records.

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
                  pattern="[0-9]*"
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
                  pattern="[0-9]*"
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


      // Firestore rules are not filters.
      // Counselor queries must include the same department
      // restriction that exists in the Firestore rules.
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

                ? "Firestore denied access to the users collection. Check that the logged-in account has role super_admin, or that the counselor department matches the user department."

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


  const [selectedDepartment, setSelectedDepartment] =
    useState("All Departments");


  const departmentCategories =
    Array.from(
      new Set(
        users.map(
          account =>
            String(
              account.department || ""
            ).trim() || "Unassigned"
        )
      )
    ).sort(
      (a, b) =>
        a.localeCompare(b)
    );


  const visibleUsers =
    isSuperAdmin &&
    selectedDepartment !== "All Departments"

      ? users.filter(
          account =>
            (
              String(
                account.department || ""
              ).trim() ||
              "Unassigned"
            ) ===
            selectedDepartment
        )

      : users;


  function selectDepartment(
    department
  ) {

    setSelectedDepartment(
      department
    );

    // Clear the old profile when changing category
    // so the detail panel always matches the active department.
    setSelected(null);
  }


  function departmentCount(
    department
  ) {

    if (
      department ===
      "All Departments"
    ) {
      return users.length;
    }


    return users.filter(
      account =>
        (
          String(
            account.department || ""
          ).trim() ||
          "Unassigned"
        ) ===
        department
    ).length;
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
            ? "View Student, Faculty, and Personnel profile information. This page is read-only."
            : `View Student, Faculty, and Personnel profiles from ${currentUser.department}. This page is read-only.`
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


      <div className="user-profile-view-layout">


        <section className="panel">

          <div className="user-list-heading">

            <div>

              <h2>
                {
                  isSuperAdmin
                    ? selectedDepartment ===
                      "All Departments"

                      ? "Users by Department"

                      : selectedDepartment

                    : "Users"
                }
              </h2>

              {isSuperAdmin && (
                <p>
                  Select a department category to view its Student, Faculty, and Personnel profiles.
                </p>
              )}

            </div>

          </div>


          {isSuperAdmin &&
           !loadingUsers &&
           !usersError &&
           users.length > 0 && (

            <div className="department-category-list">

              <button
                type="button"
                className={
                  selectedDepartment ===
                  "All Departments"
                    ? "department-category active"
                    : "department-category"
                }
                onClick={
                  () =>
                    selectDepartment(
                      "All Departments"
                    )
                }
              >
                <span>
                  All Departments
                </span>

                <strong>
                  {
                    departmentCount(
                      "All Departments"
                    )
                  }
                </strong>
              </button>


              {departmentCategories.map(
                department => (

                  <button
                    key={department}
                    type="button"
                    className={
                      selectedDepartment ===
                      department
                        ? "department-category active"
                        : "department-category"
                    }
                    onClick={
                      () =>
                        selectDepartment(
                          department
                        )
                    }
                  >

                    <span>
                      {department}
                    </span>

                    <strong>
                      {
                        departmentCount(
                          department
                        )
                      }
                    </strong>

                  </button>

                )
              )}

            </div>

          )}


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

              : users.length === 0

                ? (

                  <Empty
                    text="No Student, Faculty, or Personnel profiles were found in the users collection."
                  />

                )

                : visibleUsers.length === 0

                  ? (

                    <Empty
                      text="No user profiles are available in this department."
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
                              account.department
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

        subtitle="Your own assessment and consultation records."

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
              text="No consultation records yet."
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


  const consultationFilters =
    isSuperAdmin
      ? {}
      : {
          department:
            user.department
        };


  const all =
    useRows(
      "assessments",
      assessmentFilters
    );


  const consultations =
    useRows(
      "consultations",
      consultationFilters
    );


  const rows =
    all;


  const [selected, setSelected] =
    useState(null);


  return (

    <>

      <PageTitle

        title="Case Management"

        subtitle="Review assessment results and update intervention status."

      />


      <div className="case-layout">


        <section className="panel">

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
                text="Select a case to review."
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


      <section className="panel">

        <h2>
          Consultation requests
        </h2>


        {consultations.length === 0

          ? (

            <Empty
              text="No consultation requests."
            />

          )

          : consultations.map(
              row => (

                <article

                  className="record-card"

                  key={
                    row.id
                  }

                >

                  <strong>

                    {
                      row.ownerName
                    }

                    {" — "}

                    {
                      row.category
                    }

                  </strong>


                  <select

                    value={
                      row.status
                    }

                    onChange={
                      e =>
                        updateRecord(
                          "consultations",
                          row.id,
                          {
                            status:
                              e.target.value
                          }
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


                  <p>

                    {
                      row.date
                    }

                    {" · "}

                    {
                      row.time
                    }

                    {" · "}

                    {
                      row.mode
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

                        {" · "}

                        {
                          row.mode
                        }

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
  text
}) {

  return (

    <a
      href={href}
      className="action-card"
    >

      <strong>
        {title}
      </strong>

      <p>
        {text}
      </p>

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
                    <Dashboard />
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