import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "firebase/firestore";

import {
  auth,
  db,
  firebaseEnabled
} from "../services/firebase";

import {
  findDemoUser
} from "../services/dataService";


const AuthContext = createContext(null);

const SESSION = "mindtrack_session";


// Confirm the exact institutional account domain with PSU ICT.
// Add more domains here if the university issues accounts under
// more than one official domain.
const INSTITUTIONAL_EMAIL_DOMAINS = [
  "psu.edu.ph"
];


const GENERAL_USER_ROLES = [
  "student",
  "faculty",
  "personnel"
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


  return INSTITUTIONAL_EMAIL_DOMAINS.includes(
    parts[1]
  );
}




async function loadFirebaseProfile(
  firebaseUser
) {

  const snap =
    await getDoc(
      doc(
        db,
        "users",
        firebaseUser.uid
      )
    );


  return snap.exists()

    ? {
        id:
          firebaseUser.uid,

        email:
          firebaseUser.email,

        program: "",

        ...snap.data()
      }

    : {
        id:
          firebaseUser.uid,

        email:
          firebaseUser.email,

        name:
          firebaseUser.email,

        role:
          "student",

        department:
          "",

        program:
          "",

        userNumber:
          "",

        phoneNumber:
          "",

        address:
          "",

        facebookAccount:
          "",

        contactPersonName:
          "",

        contactPersonPhone:
          ""
      };
}


function createAuthError(
  code,
  message
) {

  const error =
    new Error(message);

  error.code = code;

  return error;
}


export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    try {

      const saved =
        localStorage.getItem(
          SESSION
        );


      return saved
        ? JSON.parse(saved)
        : null;

    } catch {

      localStorage.removeItem(
        SESSION
      );

      return null;
    }
  });


  const [loading, setLoading] =
    useState(firebaseEnabled);


  // Firebase automatically signs in a user when an account is
  // created. This flag prevents that temporary registration
  // sign-in from being treated as a normal MindTrack login.
  const authUtilityFlow =
    useRef(false);


  useEffect(() => {

    if (!firebaseEnabled) {

      setLoading(false);

      return;
    }


    const unsubscribe =
      onAuthStateChanged(
        auth,

        async firebaseUser => {

          try {

            if (
              authUtilityFlow.current
            ) {

              return;
            }


            if (!firebaseUser) {

              setUser(null);

              localStorage.removeItem(
                SESSION
              );

              setLoading(false);

              return;
            }


            await reload(
              firebaseUser
            );


            const profile =
              await loadFirebaseProfile(
                firebaseUser
              );


            const isGeneralUser =
              GENERAL_USER_ROLES.includes(
                profile.role
              );


            if (
              isGeneralUser &&
              (
                !isInstitutionalEmail(
                  firebaseUser.email
                ) ||
                !firebaseUser.emailVerified
              )
            ) {

              setUser(null);

              localStorage.removeItem(
                SESSION
              );


              await signOut(auth);


              setLoading(false);

              return;
            }


            setUser(profile);


            localStorage.setItem(
              SESSION,
              JSON.stringify(profile)
            );

          } catch (error) {

            console.error(
              "Unable to load user profile:",
              error
            );


            setUser(null);


            localStorage.removeItem(
              SESSION
            );

          } finally {

            setLoading(false);
          }
        }
      );


    return unsubscribe;

  }, []);


  // =========================
  // REGISTER
  // =========================

  async function register({
    name,
    email,
    password,
    role,
    department,
    program = "",
    userNumber,
    phoneNumber,
    address,
    facebookAccount = "",
    contactPersonName = "",
    contactPersonPhone = ""
  }) {

    if (!firebaseEnabled) {

      throw new Error(
        "Registration requires Firebase to be enabled."
      );
    }


    const allowedRoles = [
      "student",
      "faculty",
      "personnel"
    ];


    if (!allowedRoles.includes(role)) {

      throw new Error(
        "Invalid registration role."
      );
    }


    if (!name?.trim()) {

      throw new Error(
        "Full name is required."
      );
    }


    if (!department?.trim()) {

      throw new Error(
        "College or office is required."
      );
    }


    if (
      role === "student" &&
      !String(program).trim()
    ) {

      throw new Error(
        "Program is required for student accounts."
      );
    }


    if (!userNumber?.trim()) {

      throw new Error(
        role === "student"
          ? "Student number is required."
          : "Employee number is required."
      );
    }


    if (!phoneNumber?.trim()) {

      throw new Error(
        "Phone number is required."
      );
    }


    if (
      !/^\d{11}$/.test(
        phoneNumber.trim()
      )
    ) {

      throw new Error(
        "Phone number must contain exactly 11 digits."
      );
    }


    if (
      !String(
        contactPersonName || ""
      ).trim()
    ) {

      throw new Error(
        "Contact person name is required."
      );
    }


    if (
      !String(
        contactPersonPhone || ""
      ).trim()
    ) {

      throw new Error(
        "Contact person phone number is required."
      );
    }


    if (
      !/^\d{11}$/.test(
        String(
          contactPersonPhone || ""
        ).trim()
      )
    ) {

      throw new Error(
        "Contact person phone number must contain exactly 11 digits."
      );
    }


    if (!address?.trim()) {

      throw new Error(
        "Address is required."
      );
    }


    const cleanEmail =
      email
        .trim()
        .toLowerCase();


    if (
      !isInstitutionalEmail(
        cleanEmail
      )
    ) {

      throw createAuthError(
        "auth/institutional-email-required",
        "Registration requires a PSU email address ending in @psu.edu.ph."
      );
    }


    authUtilityFlow.current =
      true;


    try {

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );


      const firebaseUser =
        credential.user;


      const profile = {
        id:
          firebaseUser.uid,

        name:
          name.trim(),

        email:
          cleanEmail,

        role,

        department:
          department.trim(),

        program:
          role === "student"
            ? String(
                program || ""
              ).trim()
            : "",

        userNumber:
          userNumber.trim(),

        phoneNumber:
          phoneNumber.trim(),

        address:
          address.trim(),

        facebookAccount:
          String(
            facebookAccount || ""
          ).trim(),

        contactPersonName:
          String(
            contactPersonName || ""
          ).trim(),

        contactPersonPhone:
          String(
            contactPersonPhone || ""
          ).trim()
      };


      await setDoc(
        doc(
          db,
          "users",
          firebaseUser.uid
        ),
        profile
      );


      await sendEmailVerification(
        firebaseUser
      );


      return profile;

    } finally {

      if (auth.currentUser) {

        try {

          await signOut(auth);

        } catch (error) {

          console.error(
            "Unable to sign out after registration:",
            error
          );
        }
      }


      setUser(null);


      localStorage.removeItem(
        SESSION
      );


      authUtilityFlow.current =
        false;
    }
  }


  // =========================
  // PROFILE UPDATE
  // =========================

  async function updateProfile(changes) {

    if (!user) {

      throw new Error(
        "You must be logged in to update your profile."
      );
    }


    const allowedRoles = [
      "student",
      "faculty",
      "personnel"
    ];


    if (
      !allowedRoles.includes(
        user.role
      )
    ) {

      throw new Error(
        "Profile editing is only available to Student, Faculty, and Personnel accounts."
      );
    }


    const safeChanges = {
      phoneNumber:
        String(
          changes.phoneNumber || ""
        ).trim(),

      address:
        String(
          changes.address || ""
        ).trim(),

      facebookAccount:
        String(
          changes.facebookAccount || ""
        ).trim(),

      contactPersonName:
        String(
          changes.contactPersonName || ""
        ).trim(),

      contactPersonPhone:
        String(
          changes.contactPersonPhone || ""
        ).trim()
    };


    if (
      !/^\d{11}$/.test(
        safeChanges.phoneNumber
      )
    ) {

      throw new Error(
        "Phone number must contain exactly 11 digits."
      );
    }


    if (
      !safeChanges.contactPersonName
    ) {

      throw new Error(
        "Contact person name is required."
      );
    }


    if (
      !safeChanges.contactPersonPhone
    ) {

      throw new Error(
        "Contact person phone number is required."
      );
    }


    if (
      !/^\d{11}$/.test(
        safeChanges.contactPersonPhone
      )
    ) {

      throw new Error(
        "Contact person phone number must contain exactly 11 digits."
      );
    }


    if (!safeChanges.address) {

      throw new Error(
        "Address is required."
      );
    }


    if (firebaseEnabled) {

      await updateDoc(
        doc(
          db,
          "users",
          user.id
        ),
        safeChanges
      );
    }


    const updatedUser = {
      ...user,
      ...safeChanges
    };


    setUser(
      updatedUser
    );


    localStorage.setItem(
      SESSION,
      JSON.stringify(
        updatedUser
      )
    );


    return updatedUser;
  }


  // =========================
  // LOGIN
  // =========================

  async function login(
    email,
    password
  ) {

    if (firebaseEnabled) {

      const cleanEmail =
        email
          .trim()
          .toLowerCase();


      const credential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );


      await reload(
        credential.user
      );


      const profile =
        await loadFirebaseProfile(
          credential.user
        );


      const isGeneralUser =
        GENERAL_USER_ROLES.includes(
          profile.role
        );


      if (
        isGeneralUser &&
        !isInstitutionalEmail(
          credential.user.email
        )
      ) {

        await signOut(auth);


        throw createAuthError(
          "auth/institutional-email-required",
          "This account does not use an approved PSU institutional email address."
        );
      }


      if (
        isGeneralUser &&
        !credential.user.emailVerified
      ) {

        await signOut(auth);


        throw createAuthError(
          "auth/email-not-verified",
          "Verify your institutional email before logging in."
        );
      }


      setUser(profile);


      localStorage.setItem(
        SESSION,
        JSON.stringify(profile)
      );


      return profile;
    }


    const demoUser =
      findDemoUser(email);


    if (
      !demoUser ||
      password !==
        "password123"
    ) {

      throw new Error(
        "Invalid demo account. Use password123."
      );
    }


    const normalizedDemoUser = {
      program: "",
      phoneNumber: "",
      address: "",
      facebookAccount: "",
      contactPersonName: "",
      contactPersonPhone: "",
      ...demoUser
    };


    setUser(
      normalizedDemoUser
    );


    localStorage.setItem(
      SESSION,
      JSON.stringify(
        normalizedDemoUser
      )
    );
  }


  // =========================
  // FORGOT / RESET PASSWORD
  // =========================

  async function resetPassword(
    email
  ) {

    if (!firebaseEnabled) {

      throw new Error(
        "Password reset requires Firebase."
      );
    }


    const cleanEmail =
      String(
        email || ""
      )
        .trim()
        .toLowerCase();


    if (!cleanEmail) {

      throw createAuthError(
        "auth/email-required",
        "Enter your institutional email first."
      );
    }


    if (
      !isInstitutionalEmail(
        cleanEmail
      )
    ) {

      throw createAuthError(
        "auth/institutional-email-required",
        "Please use your official PSU institutional email address."
      );
    }


    await sendPasswordResetEmail(
      auth,
      cleanEmail
    );


    return "sent";
  }


  // =========================
  // RESEND EMAIL VERIFICATION
  // =========================

  async function resendVerificationEmail(
    email,
    password
  ) {

    if (!firebaseEnabled) {

      throw new Error(
        "Email verification requires Firebase."
      );
    }


    const cleanEmail =
      String(
        email || ""
      )
        .trim()
        .toLowerCase();


    if (
      !isInstitutionalEmail(
        cleanEmail
      )
    ) {

      throw createAuthError(
        "auth/institutional-email-required",
        "Please use your official PSU institutional email address."
      );
    }


    authUtilityFlow.current =
      true;


    try {

      const credential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );


      await reload(
        credential.user
      );


      if (
        credential.user.emailVerified
      ) {

        return "already-verified";
      }


      await sendEmailVerification(
        credential.user
      );


      return "sent";

    } finally {

      if (auth.currentUser) {

        try {

          await signOut(auth);

        } catch (error) {

          console.error(
            "Unable to sign out after resending verification:",
            error
          );
        }
      }


      setUser(null);


      localStorage.removeItem(
        SESSION
      );


      authUtilityFlow.current =
        false;
    }
  }


  // =========================
  // LOGOUT
  // =========================

  async function logout() {

    if (firebaseEnabled) {

      await signOut(auth);
    }


    setUser(null);


    localStorage.removeItem(
      SESSION
    );
  }


  const value =
    useMemo(
      () => ({
        user,
        loading,
        login,
        register,
        resetPassword,
        resendVerificationEmail,
        updateProfile,
        logout,
        firebaseEnabled
      }),
      [
        user,
        loading
      ]
    );


  return (

    <AuthContext.Provider
      value={value}
    >

      {children}

    </AuthContext.Provider>

  );
}


export function useAuth() {

  const context =
    useContext(
      AuthContext
    );


  if (!context) {

    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }


  return context;
}
