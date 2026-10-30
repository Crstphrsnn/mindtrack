import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import psuLogo from "../../assets/psu-logo.jpg";
import { useAuth } from "../../context/AuthContext";
import { COLLEGE_OPTIONS, collegePrograms } from "../../config/collegeRoster";
import { fetchPsgcItems } from "../../services/registrationService";
import useRegistrationCounselors from "../../hooks/useRegistrationCounselors";

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




export default function Register() {
  const {
    register,
    supabaseEnabled
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
    useRegistrationCounselors();


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


  // Student accounts do not choose a counselor manually.
  // The selected college / office determines the counselor.
  const studentDepartmentCounselors =
    form.role === "student" &&
    form.department
      ? activeRegistrationCounselors.filter(
          counselor =>
            String(
              counselor.department ||
              ""
            )
              .trim()
              .toLowerCase() ===
            String(
              form.department ||
              ""
            )
              .trim()
              .toLowerCase()
        )
      : [];


  const studentAutoAssignedCounselor =
    studentDepartmentCounselors.length ===
      1
      ? studentDepartmentCounselors[0]
      : null;


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


      if (
        counselorDirectoryRows.loading
      ) {

        setError(
          "Please wait while the Guidance Counselor assignment is loading."
        );

        return;
      }


      if (
        counselorDirectoryRows.error
      ) {

        setError(
          "Unable to load the Guidance Counselor directory. Please refresh the page or contact the Super Admin."
        );

        return;
      }


      const matchingStudentCounselors =
        activeRegistrationCounselors.filter(
          counselor =>
            String(
              counselor.department ||
              ""
            )
              .trim()
              .toLowerCase() ===
            registrationDepartment
              .toLowerCase()
        );


      if (
        matchingStudentCounselors.length ===
        0
      ) {

        setError(
          `No active Guidance Counselor is assigned to ${registrationDepartment}. Please contact the Super Admin before registering.`
        );

        return;
      }


      if (
        matchingStudentCounselors.length >
        1
      ) {

        setError(
          `More than one active Guidance Counselor is configured for ${registrationDepartment}. Please ask the Super Admin to keep only one active counselor for this college before registering.`
        );

        return;
      }


      const assignedStudentCounselor =
        matchingStudentCounselors[0];


      selectedCounselorId =
        String(
          assignedStudentCounselor.counselorId ||
          assignedStudentCounselor.id ||
          ""
        ).trim();


      selectedCounselorName =
        String(
          assignedStudentCounselor.name ||
          ""
        ).trim();


      selectedCounselorDepartment =
        String(
          assignedStudentCounselor.department ||
          ""
        ).trim();


      if (
        !selectedCounselorId ||
        !selectedCounselorName ||
        !selectedCounselorDepartment
      ) {

        setError(
          "The counselor assigned to the selected college has an incomplete counselor-directory record."
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
          selectedCounselorId,

        assignedCounselorName:
          selectedCounselorName,

        assignedCounselorDepartment:
          selectedCounselorDepartment,

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
        "Registration submitted! Check your PSU institutional email (including Spam) and click the verification link. You must verify your email before logging in."
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
        String(err?.message || "")
          .toLowerCase()
          .includes("database error saving new user")
      ) {
        setError(
          "Supabase could not finish creating the MindTrack profile. Check the counselor assignment and database registration trigger."
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


  if (!supabaseEnabled) {
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
            Supabase must be configured before registration can be used.
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
          Create Mindtrack Account
        </h1>

        <p>
          A secure space for psychological assessment, mental health monitoring, counseling, and referrals.
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


                  {
                    form.department &&
                    (

                      <span
                        className={
                          `student-auto-counselor-note ${
                            counselorDirectoryRows.error ||
                            (
                              !counselorDirectoryRows.loading &&
                              studentDepartmentCounselors.length !==
                                1
                            )
                              ? "warning"
                              : ""
                          }`
                        }
                      >
                        {
                          counselorDirectoryRows.loading
                            ? "Finding the Guidance Counselor assigned to this college..."
                            : counselorDirectoryRows.error
                              ? "Unable to load the Guidance Counselor assignment."
                              : studentAutoAssignedCounselor
                                ? (
                                    <>
                                      Assigned Guidance Counselor:
                                      {" "}
                                      <strong>
                                        {
                                          studentAutoAssignedCounselor.name
                                        }
                                      </strong>
                                    </>
                                  )
                                : studentDepartmentCounselors.length >
                                    1
                                  ? "Multiple active counselors are configured for this college. Please contact the Super Admin."
                                  : "No active Guidance Counselor is configured for this college. Please contact the Super Admin."
                        }
                      </span>

                    )
                  }

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
