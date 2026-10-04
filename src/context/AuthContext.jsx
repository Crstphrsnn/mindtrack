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

  deleteUser,

  onAuthStateChanged,

  reload,

  sendEmailVerification,

  sendPasswordResetEmail,

  signInWithEmailAndPassword,

  signOut

} from "firebase/auth";



import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
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

  "teaching",

  "non_teaching",

  "faculty",

  "personnel"

];


const REGISTRATION_USER_ROLES = [

  "student",

  "teaching",

  "non_teaching"

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





async function loadFirebaseProfile(
  firebaseUser
) {
  const [
    publicProfileSnap,
    privateProfileSnap
  ] = await Promise.all([
    getDoc(
      doc(
        db,
        "users",
        firebaseUser.uid
      )
    ),
    getDoc(
      doc(
        db,
        "userPrivateProfiles",
        firebaseUser.uid
      )
    )
  ]);

  if (!publicProfileSnap.exists()) {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.email,
      role: "student",
      department: "",
      program: "",
      assignedCounselorId: "",
      assignedCounselorName: "",
      assignedCounselorDepartment: "",
      userNumber: "",
      gender: "",
      phoneNumber: "",
      address: "",
      facebookAccount: "",
      contactPersonName: "",
      contactPersonPhone: ""
    };
  }

  const publicProfile =
    publicProfileSnap.data();

  const privateProfile =
    privateProfileSnap.exists()
      ? privateProfileSnap.data()
      : {};

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    program: "",
    ...publicProfile,
    phoneNumber:
      String(privateProfile.phoneNumber || ""),
    address:
      String(privateProfile.address || ""),
    facebookAccount:
      String(privateProfile.facebookAccount || ""),
    contactPersonName:
      String(privateProfile.contactPersonName || ""),
    contactPersonPhone:
      String(privateProfile.contactPersonPhone || "")
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

    assignedCounselorId = "",

    assignedCounselorName = "",

    assignedCounselorDepartment = "",

    userNumber,

    gender,

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





    const allowedRoles =
      REGISTRATION_USER_ROLES;





    if (!allowedRoles.includes(role)) {

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

      String(department || "").trim();



    const cleanProgram =

      role === "student"

        ? String(program || "").trim()

        : "";



    const cleanAssignedCounselorId =

      String(

        assignedCounselorId || ""

      ).trim();



    const cleanAssignedCounselorName =

      String(

        assignedCounselorName || ""

      ).trim();



    const cleanAssignedCounselorDepartment =

      String(

        assignedCounselorDepartment || ""

      ).trim();



    const cleanUserNumber =

      String(userNumber || "").trim();



    const cleanGender =

      String(gender || "").trim();



    const cleanPhoneNumber =

      String(phoneNumber || "").trim();



    const cleanAddress =

      String(address || "").trim();



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

        "Female"

      ].includes(

        cleanGender

      )

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





    if (!cleanContactPersonName) {

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





    authUtilityFlow.current =

      true;





    let firebaseUser = null;





    try {



      const credential =

        await createUserWithEmailAndPassword(

          auth,

          cleanEmail,

          password

        );





      firebaseUser =

        credential.user;


      // Teaching and Non-teaching users may choose a preferred counselor.
      // Student registration sends only the selected college/office and uses
      // the department-based fallback below. counselorDirectory remains the
      // source of truth for every counselor assignment.
      let resolvedAssignedCounselorId = "";
      let resolvedAssignedCounselorName = "";
      let resolvedAssignedCounselorDepartment = "";

      try {

        if (
          cleanAssignedCounselorId
        ) {

          const counselorSnapshot =
            await getDoc(
              doc(
                db,
                "counselorDirectory",
                cleanAssignedCounselorId
              )
            );


          if (
            !counselorSnapshot.exists()
          ) {

            throw new Error(
              "The selected Guidance Counselor no longer exists. Please return to registration and choose another counselor."
            );
          }


          const assignedCounselor = {
            id:
              counselorSnapshot.id,

            ...counselorSnapshot.data()
          };


          const directoryCounselorId =
            String(
              assignedCounselor.counselorId ||
              assignedCounselor.id ||
              ""
            ).trim();


          const directoryCounselorName =
            String(
              assignedCounselor.name ||
              ""
            ).trim();


          const directoryCounselorDepartment =
            String(
              assignedCounselor.department ||
              ""
            ).trim();


          if (
            assignedCounselor.active !==
            true ||
            !directoryCounselorId ||
            !directoryCounselorName ||
            !directoryCounselorDepartment
          ) {

            throw new Error(
              "The selected Guidance Counselor is not currently available for registration."
            );
          }


          if (
            directoryCounselorId !==
            cleanAssignedCounselorId
          ) {

            throw new Error(
              "The selected Guidance Counselor record is invalid."
            );
          }


          if (
            cleanDepartment !==
            directoryCounselorDepartment
          ) {

            throw new Error(
              "The selected Guidance Counselor does not match the assigned college or office."
            );
          }


          if (
            cleanAssignedCounselorName &&
            cleanAssignedCounselorName !==
              directoryCounselorName
          ) {

            throw new Error(
              "The selected Guidance Counselor name does not match the counselor directory."
            );
          }


          if (
            cleanAssignedCounselorDepartment &&
            cleanAssignedCounselorDepartment !==
              directoryCounselorDepartment
          ) {

            throw new Error(
              "The selected Guidance Counselor department does not match the counselor directory."
            );
          }


          resolvedAssignedCounselorId =
            directoryCounselorId;

          resolvedAssignedCounselorName =
            directoryCounselorName;

          resolvedAssignedCounselorDepartment =
            directoryCounselorDepartment;

        } else {

          // Student registration (and older compatible callers) sends the
          // department without a counselor ID. Resolve exactly one active
          // counselor for that college/office after Firebase Auth signs in.
          const directorySnapshot =
            await getDocs(
              query(
                collection(
                  db,
                  "counselorDirectory"
                ),
                where(
                  "department",
                  "==",
                  cleanDepartment
                )
              )
            );


          const activeCounselors =
            directorySnapshot.docs
              .map(
                item => ({
                  id:
                    item.id,

                  ...item.data()
                })
              )
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
                  ).trim() ===
                    cleanDepartment
              );


          if (
            activeCounselors.length ===
            0
          ) {

            throw new Error(
              `No active Guidance Counselor is configured for ${cleanDepartment}. Ask the Super Admin to activate a counselor first.`
            );
          }


          if (
            activeCounselors.length >
            1
          ) {

            throw new Error(
              `More than one active Guidance Counselor is configured for ${cleanDepartment}. Student registration requires exactly one active counselor for the selected college or office. Ask the Super Admin to correct counselorDirectory.`
            );
          }


          const assignedCounselor =
            activeCounselors[0];


          resolvedAssignedCounselorId =
            String(
              assignedCounselor.counselorId ||
              assignedCounselor.id
            ).trim();


          resolvedAssignedCounselorName =
            String(
              assignedCounselor.name
            ).trim();


          resolvedAssignedCounselorDepartment =
            String(
              assignedCounselor.department
            ).trim();
        }

      } catch (directoryError) {

        // Do not leave an orphaned Firebase Authentication account when
        // counselor assignment cannot be completed.
        try {
          await deleteUser(
            firebaseUser
          );
          firebaseUser = null;
        } catch (cleanupError) {
          console.error(
            "Unable to roll back Authentication user after counselor assignment failure:",
            cleanupError
          );
        }

        throw directoryError;
      }





      const publicProfile = {
        id: firebaseUser.uid,
        name: cleanName,
        email: cleanEmail,
        role,
        department: cleanDepartment,
        program: cleanProgram,
        assignedCounselorId:
          resolvedAssignedCounselorId,
        assignedCounselorName:
          resolvedAssignedCounselorName,
        assignedCounselorDepartment:
          resolvedAssignedCounselorDepartment,
        userNumber: cleanUserNumber,
        gender: cleanGender
      };

      const privateProfile = {
        ownerId: firebaseUser.uid,
        phoneNumber: cleanPhoneNumber,
        address: cleanAddress,
        facebookAccount:
          cleanFacebookAccount,
        contactPersonName:
          cleanContactPersonName,
        contactPersonPhone:
          cleanContactPersonPhone,
        updatedAt: serverTimestamp()
      };

      const profile = {
        ...publicProfile,
        phoneNumber: cleanPhoneNumber,
        address: cleanAddress,
        facebookAccount:
          cleanFacebookAccount,
        contactPersonName:
          cleanContactPersonName,
        contactPersonPhone:
          cleanContactPersonPhone
      };

      try {
        const batch =
          writeBatch(db);

        batch.set(
          doc(
            db,
            "users",
            firebaseUser.uid
          ),
          publicProfile
        );

        batch.set(
          doc(
            db,
            "assessmentLocks",
            firebaseUser.uid
          ),
          {
            ownerId:
              firebaseUser.uid,

            department:
              cleanDepartment,

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
          }
        );


        batch.set(
          doc(
            db,
            "userPrivateProfiles",
            firebaseUser.uid
          ),
          privateProfile
        );

        await batch.commit();

      } catch (profileError) {
        try {
          await deleteUser(
            firebaseUser
          );
        } catch (cleanupError) {
          console.error(
            "Unable to roll back Firebase Authentication user after profile save failure:",
            cleanupError
          );
        }

        const error =
          createAuthError(
            "auth/profile-save-failed",
            "Account creation could not be completed because Firestore rejected the MindTrack profile. The temporary Authentication account was rolled back when possible."
          );

        error.cause =
          profileError;

        throw error;
      }


      try {



        await sendEmailVerification(

          firebaseUser

        );



      } catch (verificationError) {



        console.error(

          "Unable to send verification email:",

          verificationError

        );





        throw createAuthError(

          "auth/verification-email-failed",

          "Your account and MindTrack profile were created, but the verification email could not be sent. Use the verification resend option before logging in."

        );

      }





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
      "teaching",
      "non_teaching",
      "faculty",
      "personnel"
    ];

    if (!allowedRoles.includes(user.role)) {
      throw new Error(
        "Profile editing is only available to Student, Teaching, and Non-teaching accounts."
      );
    }

    const safeChanges = {
      phoneNumber:
        String(changes.phoneNumber || "").trim(),
      address:
        String(changes.address || "").trim(),
      facebookAccount:
        String(changes.facebookAccount || "").trim(),
      contactPersonName:
        String(changes.contactPersonName || "").trim(),
      contactPersonPhone:
        String(changes.contactPersonPhone || "").trim()
    };

    if (!/^\d{11}$/.test(safeChanges.phoneNumber)) {
      throw new Error(
        "Phone number must contain exactly 11 digits."
      );
    }

    if (!safeChanges.address) {
      throw new Error(
        "Address is required."
      );
    }

    if (!safeChanges.contactPersonName) {
      throw new Error(
        "Contact person name is required."
      );
    }

    if (!/^\d{11}$/.test(safeChanges.contactPersonPhone)) {
      throw new Error(
        "Contact person phone number must contain exactly 11 digits."
      );
    }

    if (firebaseEnabled) {
      await setDoc(
        doc(
          db,
          "userPrivateProfiles",
          user.id
        ),
        {
          ownerId: user.id,
          ...safeChanges,
          updatedAt: serverTimestamp()
        },
        {
          merge: true
        }
      );
    }

    const updatedUser = {
      ...user,
      ...safeChanges
    };

    setUser(updatedUser);

    localStorage.setItem(
      SESSION,
      JSON.stringify(updatedUser)
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

        profile.role === "student" &&

        !isValidStudentInstitutionalEmail(

          credential.user.email

        )

      ) {



        await signOut(auth);





        throw createAuthError(

          "auth/invalid-student-institutional-email",

          "This student account does not use the required PSU student email format."

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





    try {

      auth.useDeviceLanguage();

    } catch {

      // Non-critical. Firebase can still send the email.

    }





    const actionCodeSettings = {

      url:

        `${window.location.origin}/login`,



      handleCodeInApp:

        false

    };





    await sendPasswordResetEmail(

      auth,

      cleanEmail,

      actionCodeSettings

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
