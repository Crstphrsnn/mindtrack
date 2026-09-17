import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
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


export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION);

      return saved
        ? JSON.parse(saved)
        : null;
    } catch {
      localStorage.removeItem(SESSION);
      return null;
    }
  });


  const [loading, setLoading] =
    useState(firebaseEnabled);


  useEffect(() => {

    if (!firebaseEnabled) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async firebaseUser => {

        try {

          if (!firebaseUser) {

            setUser(null);

            localStorage.removeItem(SESSION);

            setLoading(false);

            return;
          }


          const snap = await getDoc(
            doc(
              db,
              "users",
              firebaseUser.uid
            )
          );


          const profile = snap.exists()

            ? {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                ...snap.data()
              }

            : {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.email,
                role: "student",
                department: "",
                userNumber: "",
                phoneNumber: "",
                address: "",
                facebookAccount: "",
                contactPersonName: "",
                contactPersonPhone: ""
              };


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

          localStorage.removeItem(SESSION);

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


    if (!/^\d+$/.test(phoneNumber.trim())) {
      throw new Error(
        "Phone number must contain numbers only."
      );
    }


    if (
      contactPersonPhone?.trim() &&
      !/^\d+$/.test(
        contactPersonPhone.trim()
      )
    ) {
      throw new Error(
        "Contact person phone number must contain numbers only."
      );
    }


    if (!address?.trim()) {
      throw new Error(
        "Address is required."
      );
    }


    const cleanEmail = email
      .trim()
      .toLowerCase();


    const credential =
      await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );


    const firebaseUser =
      credential.user;


    const profile = {
      id: firebaseUser.uid,
      name: name.trim(),
      email: cleanEmail,
      role,
      department: department.trim(),
      userNumber: userNumber.trim(),
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      facebookAccount: String(
        facebookAccount || ""
      ).trim(),
      contactPersonName: String(
        contactPersonName || ""
      ).trim(),
      contactPersonPhone: String(
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


    // Firebase automatically signs in a newly registered account.
    // Sign it out so the user must login manually.
    await signOut(auth);


    setUser(null);


    localStorage.removeItem(
      SESSION
    );


    return profile;
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


    if (!allowedRoles.includes(user.role)) {
      throw new Error(
        "Profile editing is only available to Student, Faculty, and Personnel accounts."
      );
    }


    // Only these fields are editable from the Profile page.
    // This matches the Firestore rule we prepared.
    const safeChanges = {
      phoneNumber: String(
        changes.phoneNumber || ""
      ).trim(),

      address: String(
        changes.address || ""
      ).trim(),

      facebookAccount: String(
        changes.facebookAccount || ""
      ).trim(),

      contactPersonName: String(
        changes.contactPersonName || ""
      ).trim(),

      contactPersonPhone: String(
        changes.contactPersonPhone || ""
      ).trim()
    };


    if (!safeChanges.phoneNumber) {
      throw new Error(
        "Phone number is required."
      );
    }


    if (
      !/^\d+$/.test(
        safeChanges.phoneNumber
      )
    ) {
      throw new Error(
        "Phone number must contain numbers only."
      );
    }


    if (
      safeChanges.contactPersonPhone &&
      !/^\d+$/.test(
        safeChanges.contactPersonPhone
      )
    ) {
      throw new Error(
        "Contact person phone number must contain numbers only."
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

      await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      return;
    }


    const demoUser =
      findDemoUser(email);


    if (
      !demoUser ||
      password !== "password123"
    ) {

      throw new Error(
        "Invalid demo account. Use password123."
      );

    }


    const normalizedDemoUser = {
      phoneNumber: "",
      address: "",
      facebookAccount: "",
      contactPersonName: "",
      contactPersonPhone: "",
      ...demoUser
    };


    setUser(normalizedDemoUser);


    localStorage.setItem(
      SESSION,
      JSON.stringify(normalizedDemoUser)
    );

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
    useContext(AuthContext);


  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }


  return context;
}
