import {
  initializeApp
} from "firebase/app";

import {
  getAuth
} from "firebase/auth";

import {
  getFirestore
} from "firebase/firestore";

import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider
} from "firebase/app-check";


const config = {
  apiKey:
    import.meta.env
      .VITE_FIREBASE_API_KEY,

  authDomain:
    import.meta.env
      .VITE_FIREBASE_AUTH_DOMAIN,

  projectId:
    import.meta.env
      .VITE_FIREBASE_PROJECT_ID,

  storageBucket:
    import.meta.env
      .VITE_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    import.meta.env
      .VITE_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    import.meta.env
      .VITE_FIREBASE_APP_ID
};


const appCheckKey =
  import.meta.env
    .VITE_RECAPTCHA_ENTERPRISE_KEY;


export const firebaseEnabled =
  Boolean(
    config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.appId
  );


let app = null;
let auth = null;
let db = null;
let appCheck = null;


if (firebaseEnabled) {

  // ==========================================
  // INITIALIZE FIREBASE
  // ==========================================

  app =
    initializeApp(
      config
    );


  // ==========================================
  // FIREBASE APP CHECK
  // ==========================================
  //
  // Development:
  // Uses Firebase App Check debug mode.
  //
  // Production:
  // Uses reCAPTCHA Enterprise normally.
  //
  // Never enable this debug token manually
  // in production.
  // ==========================================

  if (
    import.meta.env.DEV &&
    typeof globalThis !==
      "undefined"
  ) {

    globalThis
      .FIREBASE_APPCHECK_DEBUG_TOKEN =
      true;
  }


  if (appCheckKey) {

    try {

      appCheck =
        initializeAppCheck(
          app,
          {
            provider:
              new ReCaptchaEnterpriseProvider(
                appCheckKey
              ),

            isTokenAutoRefreshEnabled:
              true
          }
        );

      console.log(
        "Firebase App Check initialized."
      );

    } catch (error) {

      console.error(
        "Unable to initialize Firebase App Check:",
        error
      );
    }

  } else {

    console.warn(
      "Firebase App Check is not configured. VITE_RECAPTCHA_ENTERPRISE_KEY is missing."
    );
  }


  // ==========================================
  // FIREBASE SERVICES
  // ==========================================

  auth =
    getAuth(
      app
    );


  db =
    getFirestore(
      app
    );
}


export {
  app,
  auth,
  db,
  appCheck
};