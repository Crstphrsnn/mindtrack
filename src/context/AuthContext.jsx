import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
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

const AuthContext = createContext(null);
const SESSION = "mindtrack-session";

const demoUsers = [
  {
    id: "demo-student",
    name: "Juan Dela Cruz",
    email: "student@psu.edu.ph",
    role: "student",
    department: "CCS",
    userNumber: "2026-12345",
    phoneNumber: "",
    address: "",
    facebookAccount: "",
    contactPersonName: "",
    contactPersonPhone: ""
  },
  {
    id: "demo-faculty",
    name: "Faculty User",
    email: "faculty@psu.edu.ph",
    role: "faculty",
    department: "CTE",
    userNumber: "EMP-1001",
    phoneNumber: "",
    address: "",
    facebookAccount: "",
    contactPersonName: "",
    contactPersonPhone: ""
  },
  {
    id: "demo-personnel",
    name: "Personnel User",
    email: "personnel@psu.edu.ph",
    role: "personnel",
    department: "Administration",
    userNumber: "EMP-1002",
    phoneNumber: "",
    address: "",
    facebookAccount: "",
    contactPersonName: "",
    contactPersonPhone: ""
  },
  {
    id: "demo-counselor",
    name: "CCS Guidance Counselor",
    email: "counselor.ccs@psu.edu.ph",
    role: "counselor",
    department: "CCS"
  },
  {
    id: "demo-super-admin",
    name: "System Super Admin",
    email: "superadmin@psu.edu.ph",
    role: "super_admin",
    department: "All"
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseEnabled) {
      try {
        const saved = localStorage.getItem(SESSION);
        setUser(saved ? JSON.parse(saved) : null);
      } catch {
        localStorage.removeItem(SESSION);
        setUser(null);
      }
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      try {
        if (!firebaseUser) {
          setUser(null);
          localStorage.removeItem(SESSION);
          return;
        }

        const profileSnap = await getDoc(
          doc(db, "users", firebaseUser.uid)
        );

        if (!profileSnap.exists()) {
          setUser(null);
          return;
        }

        const profile = {
          id: firebaseUser.uid,
          ...profileSnap.data()
        };

        setUser(profile);
      } catch (error) {
        console.error("Unable to load user profile:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function login(email, password) {
    const cleanEmail = email.trim().toLowerCase();

    if (!firebaseEnabled) {
      const demo = demoUsers.find(
        account => account.email.toLowerCase() === cleanEmail
      );

      if (!demo || password !== "password123") {
        const error = new Error("Invalid email or password.");
        error.code = "auth/invalid-credential";
        throw error;
      }

      setUser(demo);
      localStorage.setItem(SESSION, JSON.stringify(demo));
      return demo;
    }

    const credential = await signInWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );

    const firebaseUser = credential.user;
    const profileSnap = await getDoc(
      doc(db, "users", firebaseUser.uid)
    );

    if (!profileSnap.exists()) {
      await signOut(auth);
      throw new Error(
        "Your authentication account exists, but no MindTrack profile was found."
      );
    }

    const profile = {
      id: firebaseUser.uid,
      ...profileSnap.data()
    };

    setUser(profile);
    return profile;
  }

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

    const allowedRoles = [
      "student",
      "teaching",
      "non_teaching"
    ];

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
      !cleanEmail.endsWith(
        "@psu.edu.ph"
      )
    ) {
      const error =
        new Error(
          "Registration requires an official PSU institutional email address ending in @psu.edu.ph."
        );

      error.code =
        "auth/institutional-email-required";

      throw error;
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
        "Please select a valid gender."
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

    if (
      !cleanAssignedCounselorId ||
      !cleanAssignedCounselorName ||
      !cleanAssignedCounselorDepartment
    ) {
      throw new Error(
        role === "student"
          ? "No active Guidance Counselor is linked to the selected college."
          : "Please select a valid preferred Guidance Counselor."
      );
    }


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


      const profile = {
        id:
          firebaseUser.uid,

        name:
          cleanName,

        email:
          cleanEmail,

        role,

        department:
          cleanDepartment,

        program:
          cleanProgram,

        assignedCounselorId:
          cleanAssignedCounselorId,

        assignedCounselorName:
          cleanAssignedCounselorName,

        assignedCounselorDepartment:
          cleanAssignedCounselorDepartment,

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
          cleanContactPersonPhone
      };


      try {
        await setDoc(
          doc(
            db,
            "users",
            firebaseUser.uid
          ),
          profile
        );
      } catch (profileError) {
        // Authentication succeeds before Firestore profile creation.
        // Remove the newly created Auth user when the profile write
        // fails so the email is not left stuck as "already in use".
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
          new Error(
            "Account creation could not be completed because Firestore rejected the profile. The temporary Authentication account was rolled back when possible."
          );

        error.code =
          "auth/profile-save-failed";

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

        const error =
          new Error(
            "Your account and MindTrack profile were created, but the verification email could not be sent. Please use the verification resend option before logging in."
          );

        error.code =
          "auth/verification-email-failed";

        throw error;
      }


      await signOut(auth);

      setUser(null);

      localStorage.removeItem(
        SESSION
      );


      return profile;

    } catch (error) {
      // Make sure a temporary registration sign-in does not stay active.
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error(
            "Unable to sign out after registration error:",
            signOutError
          );
        }
      }

      throw error;
    }
  }

  async function updateProfile(changes) {
    if (!user) {
      throw new Error("You must be logged in to update your profile.");
    }

    const allowedRoles = [
      "student",
      "teaching",
      "non_teaching",
      "faculty",
      "personnel"
    ];

    if (!allowedRoles.includes(user.role)) {
      throw new Error("Profile editing is only available to general users.");
    }

    const safeChanges = {
      phoneNumber: String(changes.phoneNumber || "").trim(),
      address: String(changes.address || "").trim(),
      facebookAccount: String(changes.facebookAccount || "").trim(),
      contactPersonName: String(changes.contactPersonName || "").trim(),
      contactPersonPhone: String(changes.contactPersonPhone || "").trim()
    };

    if (!safeChanges.phoneNumber) {
      throw new Error("Phone number is required.");
    }

    if (!safeChanges.address) {
      throw new Error("Address is required.");
    }

    if (firebaseEnabled) {
      await updateDoc(
        doc(db, "users", user.id),
        safeChanges
      );
    }

    const updatedUser = {
      ...user,
      ...safeChanges
    };

    setUser(updatedUser);

    if (!firebaseEnabled) {
      localStorage.setItem(
        SESSION,
        JSON.stringify(updatedUser)
      );
    }

    return updatedUser;
  }

  async function logout() {
    if (firebaseEnabled) {
      await signOut(auth);
    }

    setUser(null);
    localStorage.removeItem(SESSION);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      updateProfile,
      logout,
      firebaseEnabled
    }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
