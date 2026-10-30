import React, {

  createContext,

  useContext,

  useEffect,

  useMemo,

  useState,

} from "react";



import { supabase } from "../services/supabase";





const AuthContext = createContext(null);



const SESSION = "mindtrack_session";

// Set only after the confirmation-link redirect has been processed.
const EMAIL_VERIFICATION_NOTICE = "mindtrack_email_verification_notice";

function isEmailVerificationReturn() {
  if (typeof window === "undefined") return false;
  return (
    window.location.pathname === "/login" &&
    new URLSearchParams(window.location.search).get("mindtrack_verified") === "1"
  );
}

// Keep password-recovery sessions out of MindTrack's normal profile login.
// Supabase uses this temporary session only to authorize updateUser(password).
function isPasswordRecoveryReturn() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    window.location.pathname === "/reset-password" ||
    (window.location.pathname === "/login" && params.get("mode") === "recovery")
  );
}

function isEmailConfirmed(authUser) {
  // For email/password users, use email_confirmed_at (not phone confirmation).
  return Boolean(authUser?.email_confirmed_at);
}






const INSTITUTIONAL_EMAIL_DOMAINS = [

  "psu.edu.ph",

];





const GENERAL_USER_ROLES = [

  "student",

  "teaching",

  "non_teaching",

  "faculty",

  "personnel",

];





const REGISTRATION_USER_ROLES = [

  "student",

  "teaching",

  "non_teaching",

];





const supabaseEnabled = Boolean(supabase);





// ============================================================

// HELPERS

// ============================================================



function createAuthError(code, message) {

  const error = new Error(message);

  error.code = code;



  return error;

}





function isInstitutionalEmail(email) {

  const cleanEmail = String(email || "")

    .trim()

    .toLowerCase();



  const parts = cleanEmail.split("@");



  if (parts.length !== 2) {

    return false;

  }



  return INSTITUTIONAL_EMAIL_DOMAINS.includes(parts[1]);

}





function isValidStudentInstitutionalEmail(email) {

  const cleanEmail = String(email || "")

    .trim()

    .toLowerCase();



  return /^\d{2}ln\d{4}_ms@psu\.edu\.ph$/.test(cleanEmail);

}





// ============================================================

// LOAD ASSIGNED COUNSELOR

// ============================================================



async function loadAssignedCounselor(userId) {

  const {

    data: assignment,

    error: assignmentError,

  } = await supabase

    .from("counselor_assignments")

    .select("counselor_id")

    .eq("student_id", userId)

    .eq("active", true)

    .order("started_at", {

      ascending: false,

    })

    .limit(1)

    .maybeSingle();





  if (assignmentError) {

    console.warn(

      "Unable to load counselor assignment:",

      assignmentError

    );



    return {

      assignedCounselorId: "",

      assignedCounselorName: "",

      assignedCounselorDepartment: "",

    };

  }





  if (!assignment?.counselor_id) {

    return {

      assignedCounselorId: "",

      assignedCounselorName: "",

      assignedCounselorDepartment: "",

    };

  }





  const {

    data: counselor,

    error: counselorError,

  } = await supabase

    .from("profiles")

    .select(`

      id,

      name,

      department_id,

      departments (

        name

      )

    `)

    .eq("id", assignment.counselor_id)

    .maybeSingle();





  if (counselorError) {

    console.warn(

      "Unable to load assigned counselor profile:",

      counselorError

    );

  }





  return {

    assignedCounselorId:

      assignment.counselor_id,



    assignedCounselorName:

      counselor?.name || "",



    assignedCounselorDepartment:

      counselor?.departments?.name || "",

  };

}





// ============================================================

// LOAD MINDTRACK PROFILE

// ============================================================



async function loadSupabaseProfile(authUser) {

  if (!authUser?.id) {

    throw createAuthError(

      "auth/profile-not-found",

      "Authenticated user is missing."

    );

  }





  const {

    data: publicProfile,

    error: publicProfileError,

  } = await supabase

    .from("profiles")

    .select(`

      id,

      email,

      name,

      role,

      gender,

      user_number,

      program,

      department_id,

      departments (

        name

      )

    `)

    .eq("id", authUser.id)

    .maybeSingle();





  if (publicProfileError) {

    console.error(

      "Unable to read Supabase profile:",

      publicProfileError

    );



    throw publicProfileError;

  }





  if (!publicProfile) {

    throw createAuthError(

      "auth/profile-not-found",

      "Your Supabase Authentication account exists, but its MindTrack profile is missing."

    );

  }





  let privateProfile = {};





  if (

    GENERAL_USER_ROLES.includes(

      publicProfile.role

    )

  ) {

    const {

      data,

      error,

    } = await supabase

      .from("private_profiles")

      .select(`

        phone_number,

        address,

        facebook_account,

        contact_person_name,

        contact_person_phone

      `)

      .eq("user_id", authUser.id)

      .maybeSingle();





    if (error) {

      console.warn(

        "Unable to load private profile:",

        error

      );

    } else {

      privateProfile = data || {};

    }

  }





  const counselor =

    await loadAssignedCounselor(

      authUser.id

    );





  return {

    id: authUser.id,



    name:

      publicProfile.name || "",



    email:

      authUser.email ||

      publicProfile.email ||

      "",



    role:

      publicProfile.role,



    gender:

      publicProfile.gender || "",



    userNumber:

      publicProfile.user_number || "",



    department:

      publicProfile.departments?.name || "",



    departmentId:

      publicProfile.department_id || "",



    program:

      publicProfile.program || "",



    assignedCounselorId:

      counselor.assignedCounselorId,



    assignedCounselorName:

      counselor.assignedCounselorName,



    assignedCounselorDepartment:

      counselor.assignedCounselorDepartment,



    phoneNumber:

      String(

        privateProfile.phone_number || ""

      ),



    address:

      String(

        privateProfile.address || ""

      ),



    facebookAccount:

      String(

        privateProfile.facebook_account || ""

      ),



    contactPersonName:

      String(

        privateProfile.contact_person_name || ""

      ),



    contactPersonPhone:

      String(

        privateProfile.contact_person_phone || ""

      ),

  };

}





// ============================================================

// AUTH PROVIDER

// ============================================================



export function AuthProvider({

  children,

}) {



  const [user, setUser] =

    useState(() => {

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

    useState(true);





  function clearLocalUser() {

    setUser(null);



    localStorage.removeItem(

      SESSION

    );

  }





  async function synchronizeUser(

    authUser

  ) {



    if (!authUser) {

      clearLocalUser();



      return null;

    }





    // Never restore an unverified email/password session, including
    // sessions left in browser storage from older application versions.
    if (!isEmailConfirmed(authUser)) {
      clearLocalUser();
      await supabase.auth.signOut();
      throw createAuthError(
        "auth/email-not-verified",
        "Verify your institutional email before signing in to MindTrack."
      );
    }

    const profile =

      await loadSupabaseProfile(

        authUser

      );





    setUser(profile);



    localStorage.setItem(

      SESSION,

      JSON.stringify(profile)

    );





    return profile;

  }





  // ==========================================================

  // RESTORE SUPABASE SESSION

  // ==========================================================



  useEffect(() => {

    let active = true;





    async function initializeAuth() {



      if (!supabaseEnabled) {

        if (active) {

          setLoading(false);

        }



        return;

      }





      try {

        const {

          data,

          error,

        } =

          await supabase.auth

            .getSession();





        if (error) {

          throw error;

        }





        // Supabase may create a session when the email-confirmation
        // link is opened. End that session so users log in manually.
        if (isEmailVerificationReturn()) {
          const verified = isEmailConfirmed(data?.session?.user);
          if (data?.session) {
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) throw signOutError;
          }
          if (active) clearLocalUser();
          // Persist the notice even if React StrictMode has already
          // cleaned up this effect. Do not overwrite a verified result.
          const previousNotice = sessionStorage.getItem(EMAIL_VERIFICATION_NOTICE);
          if (verified || previousNotice !== "verified") {
            sessionStorage.setItem(
              EMAIL_VERIFICATION_NOTICE,
              verified ? "verified" : "not_verified"
            );
          }
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("mindtrack_verified");
          cleanUrl.searchParams.delete("code");
          cleanUrl.hash = "";
          window.history.replaceState(
            window.history.state,
            "",
            `${cleanUrl.pathname}${cleanUrl.search}`
          );
          return;
        }

        // A password-reset email creates a short-lived authenticated session.
        // Do not treat that session as a normal MindTrack login or redirect
        // the user away from the password-reset form.
        if (isPasswordRecoveryReturn()) {
          if (active) clearLocalUser();
          return;
        }

        if (

          active &&

          data?.session?.user

        ) {



          await synchronizeUser(

            data.session.user

          );



        } else if (active) {



          clearLocalUser();



        }



      } catch (error) {



        console.error(

          "Unable to initialize Supabase session:",

          error

        );



        if (active) {

          clearLocalUser();

        }



      } finally {



        if (active) {

          setLoading(false);

        }



      }

    }





    initializeAuth();





    const {

      data: authListener,

    } =

      supabase.auth

        .onAuthStateChange(

          (_event, session) => {



            if (!active) {

              return;

            }





            // The initializer handles confirmation redirects.
            if (isEmailVerificationReturn()) return;

            // Never load a MindTrack profile during password recovery.
            if (isPasswordRecoveryReturn()) {
              clearLocalUser();
              setLoading(false);
              return;
            }

            if (!session?.user) {



              clearLocalUser();



              setLoading(false);



              return;

            }





            Promise.resolve()

              .then(() =>

                synchronizeUser(

                  session.user

                )

              )

              .catch(error => {



                console.error(

                  "Auth synchronization failed:",

                  error

                );



              })

              .finally(() => {



                if (active) {

                  setLoading(false);

                }



              });

          }

        );





    return () => {



      active = false;



      authListener

        ?.subscription

        ?.unsubscribe();



    };



  }, []);





  // ==========================================================

  // REGISTER

  // ==========================================================



  async function register({

    name,

    email,

    password,

    role,

    department,



    program = "",



    assignedCounselorId = "",

    assignedCounselorName = "",

    assignedCounselorDepartment = "",



    userNumber,

    gender,



    phoneNumber,

    address,



    facebookAccount = "",



    contactPersonName = "",

    contactPersonPhone = "",

  }) {



    if (!supabaseEnabled) {

      throw new Error(

        "Supabase is not configured."

      );

    }





    if (

      !REGISTRATION_USER_ROLES.includes(

        role

      )

    ) {

      throw new Error(

        "Invalid registration role."

      );

    }





    const cleanName =

      String(name || "").trim();





    const cleanEmail =

      String(email || "")

        .trim()

        .toLowerCase();





    const cleanDepartment =

      String(

        department || ""

      ).trim();





    const cleanProgram =

      role === "student"

        ? String(

            program || ""

          ).trim()

        : "";





    const cleanAssignedCounselorId =

      String(

        assignedCounselorId || ""

      ).trim();





    const cleanUserNumber =

      String(

        userNumber || ""

      ).trim();





    const cleanGender =

      String(

        gender || ""

      ).trim();





    const cleanPhoneNumber =

      String(

        phoneNumber || ""

      ).trim();





    const cleanAddress =

      String(

        address || ""

      ).trim();





    const cleanFacebookAccount =

      String(

        facebookAccount || ""

      ).trim();





    const cleanContactPersonName =

      String(

        contactPersonName || ""

      ).trim();





    const cleanContactPersonPhone =

      String(

        contactPersonPhone || ""

      ).trim();





    // ----------------------------------------------------------

    // VALIDATION

    // ----------------------------------------------------------



    if (!cleanName) {

      throw new Error(

        "Full name is required."

      );

    }





    if (

      !isInstitutionalEmail(

        cleanEmail

      )

    ) {



      throw createAuthError(

        "auth/institutional-email-required",

        "Registration requires an official PSU institutional email address ending in @psu.edu.ph."

      );



    }





    if (

      role === "student" &&

      !isValidStudentInstitutionalEmail(

        cleanEmail

      )

    ) {



      throw createAuthError(

        "auth/invalid-student-institutional-email",

        "Student institutional email must follow the required PSU student email format."

      );



    }





    if (!cleanDepartment) {



      throw new Error(

        "College or office is required."

      );



    }





    if (

      role === "student" &&

      !cleanProgram

    ) {



      throw new Error(

        "Program is required for student accounts."

      );



    }





    if (

      ![

        "Male",

        "Female",

      ].includes(cleanGender)

    ) {



      throw new Error(

        "Please select a valid sex."

      );



    }





    if (!cleanUserNumber) {



      throw new Error(

        role === "student"

          ? "Student number is required."

          : "Employee number is required."

      );



    }





    if (

      !/^\d{11}$/.test(

        cleanPhoneNumber

      )

    ) {



      throw new Error(

        "Phone number must contain exactly 11 digits."

      );



    }





    if (!cleanAddress) {



      throw new Error(

        "Address is required."

      );



    }





    if (

      !cleanContactPersonName

    ) {



      throw new Error(

        "Contact person name is required."

      );



    }





    if (

      !/^\d{11}$/.test(

        cleanContactPersonPhone

      )

    ) {



      throw new Error(

        "Contact person phone number must contain exactly 11 digits."

      );



    }





    if (

      [

        "teaching",

        "non_teaching",

      ].includes(role) &&

      !cleanAssignedCounselorId

    ) {



      throw new Error(

        "Please select a Guidance Counselor."

      );



    }





    // ----------------------------------------------------------

    // CREATE SUPABASE AUTH USER

    // ----------------------------------------------------------



    const {

      data,

      error,

    } =

      await supabase.auth

        .signUp({



          email:

            cleanEmail,



          password,



          options: {



            emailRedirectTo:

              `${window.location.origin}/login?mindtrack_verified=1`,



            data: {



              name:

                cleanName,



              role,



              department:

                cleanDepartment,



              program:

                cleanProgram,



              userNumber:

                cleanUserNumber,



              gender:

                cleanGender,



              phoneNumber:

                cleanPhoneNumber,



              address:

                cleanAddress,



              facebookAccount:

                cleanFacebookAccount,



              contactPersonName:

                cleanContactPersonName,



              contactPersonPhone:

                cleanContactPersonPhone,



              assignedCounselorId:

                cleanAssignedCounselorId,



              assignedCounselorName:

                String(

                  assignedCounselorName ||

                  ""

                ).trim(),



              assignedCounselorDepartment:

                String(

                  assignedCounselorDepartment ||

                  ""

                ).trim(),

            },

          },

        });





    if (error) {

      throw error;

    }





    if (!data?.user) {

      throw new Error(

        "Supabase did not create the account."

      );

    }





    // Email confirmation MUST be enabled in Supabase Auth settings.
    // A session after signUp means confirmation is disabled or the
    // account was already confirmed. Never leave a signup session active.

    if (data.session) {



      await supabase.auth.signOut();



    }





    clearLocalUser();





    return {



      id:

        data.user.id,



      name:

        cleanName,



      email:

        cleanEmail,



      role,



      department:

        cleanDepartment,



      program:

        cleanProgram,



      userNumber:

        cleanUserNumber,



      gender:

        cleanGender,

    };

  }





  // ==========================================================

  // LOGIN

  // ==========================================================



  async function login(

    email,

    password

  ) {



    if (!supabaseEnabled) {

      throw new Error(

        "Supabase is not configured."

      );

    }





    const cleanEmail =

      String(email || "")

        .trim()

        .toLowerCase();





    const {

      data,

      error,

    } =

      await supabase.auth

        .signInWithPassword({



          email:

            cleanEmail,



          password,



        });





    if (error) {
      if (
        error.code === "email_not_confirmed" ||
        /email\s+not\s+confirmed/i.test(error.message || "")
      ) {
        throw createAuthError(
          "auth/email-not-verified",
          "Verify your PSU institutional email before logging in."
        );
      }
      throw error;
    }





    if (!data?.user) {



      throw createAuthError(

        "auth/invalid-login",

        "Unable to sign in."

      );



    }





    if (!isEmailConfirmed(data.user)) {
      await supabase.auth.signOut();
      clearLocalUser();
      throw createAuthError(
        "auth/email-not-verified",
        "Verify your PSU institutional email before logging in."
      );
    }

    const profile =

      await loadSupabaseProfile(

        data.user

      );





    const isGeneralUser =

      GENERAL_USER_ROLES.includes(

        profile.role

      );





    if (

      isGeneralUser &&

      !isInstitutionalEmail(

        data.user.email

      )

    ) {



      await supabase.auth.signOut();



      throw createAuthError(

        "auth/institutional-email-required",

        "This account does not use an approved PSU institutional email address."

      );



    }





    if (

      profile.role === "student" &&

      !isValidStudentInstitutionalEmail(

        data.user.email

      )

    ) {



      await supabase.auth.signOut();



      throw createAuthError(

        "auth/invalid-student-institutional-email",

        "This student account does not use the required PSU student email format."

      );



    }





    setUser(profile);





    localStorage.setItem(

      SESSION,

      JSON.stringify(profile)

    );





    return profile;

  }





  // ==========================================================

  // UPDATE PROFILE

  // ==========================================================



  async function updateProfile(

    changes

  ) {



    if (!user) {



      throw new Error(

        "You must be logged in to update your profile."

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

          changes.contactPersonName ||

          ""

        ).trim(),



      contactPersonPhone:

        String(

          changes.contactPersonPhone ||

          ""

        ).trim(),

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





    if (!safeChanges.address) {



      throw new Error(

        "Address is required."

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

      !/^\d{11}$/.test(

        safeChanges.contactPersonPhone

      )

    ) {



      throw new Error(

        "Contact person phone number must contain exactly 11 digits."

      );



    }





    const {

      error,

    } =

      await supabase

        .from("private_profiles")

        .upsert(

          {



            user_id:

              user.id,



            phone_number:

              safeChanges.phoneNumber,



            address:

              safeChanges.address,



            facebook_account:

              safeChanges.facebookAccount,



            contact_person_name:

              safeChanges.contactPersonName,



            contact_person_phone:

              safeChanges.contactPersonPhone,

          },

          {

            onConflict:

              "user_id",

          }

        );





    if (error) {

      throw error;

    }





    const updatedUser = {

      ...user,

      ...safeChanges,

    };





    setUser(updatedUser);





    localStorage.setItem(

      SESSION,

      JSON.stringify(

        updatedUser

      )

    );





    return updatedUser;

  }





  // ==========================================================

  // RESET PASSWORD

  // ==========================================================



  async function resetPassword(

    email

  ) {



    const cleanEmail =

      String(email || "")

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





    const {

      error,

    } =

      await supabase.auth

        .resetPasswordForEmail(

          cleanEmail,

          {

            redirectTo:

              `${window.location.origin}/reset-password`,

          }

        );





    if (error) {

      throw error;

    }





    return "sent";

  }





  // ==========================================================

  // RESEND EMAIL VERIFICATION

  // ==========================================================



  async function resendVerificationEmail(

    email,

    _password

  ) {



    const cleanEmail =

      String(email || "")

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





    const {

      error,

    } =

      await supabase.auth.resend({



        type:

          "signup",



        email:

          cleanEmail,



        options: {



          emailRedirectTo:

            `${window.location.origin}/login?mindtrack_verified=1`,



        },



      });





    if (error) {

      throw error;

    }





    return "sent";

  }





  // ==========================================================

  // UPDATE PASSWORD AFTER RECOVERY

  // ==========================================================



  async function updatePassword(

    newPassword

  ) {



    if (

      !newPassword ||

      newPassword.length < 6

    ) {



      throw new Error(

        "Password must contain at least 6 characters."

      );



    }





    const {

      error,

    } =

      await supabase.auth

        .updateUser({



          password:

            newPassword,



        });





    if (error) {

      throw error;

    }





    return "updated";

  }





  // ==========================================================

  // LOGOUT

  // ==========================================================



  async function logout() {



    if (supabaseEnabled) {



      const {

        error,

      } =

        await supabase.auth

          .signOut();





      if (error) {

        throw error;

      }



    }





    clearLocalUser();

  }





  // ==========================================================

  // CONTEXT VALUE

  // ==========================================================



  const value =

    useMemo(

      () => ({



        user,



        loading,



        login,



        register,



        resetPassword,



        resendVerificationEmail,



        updatePassword,



        updateProfile,



        logout,



        supabaseEnabled,





        /*

         * TEMPORARY COMPATIBILITY

         *

         * Some old MindTrack components

         * may still check:

         *

         * firebaseEnabled

         *

         * This DOES NOT connect Firebase.

         *

         * We'll remove this after all

         * remaining files are migrated.

         */

        firebaseEnabled:

          supabaseEnabled,



      }),

      [

        user,

        loading,

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





// ============================================================

// USE AUTH HOOK

// ============================================================



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