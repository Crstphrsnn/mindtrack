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
  getToken,
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


const configuredDebugToken =
  import.meta.env
    .VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;


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
  // Local development:
  // Firebase App Check must use a registered debug token when
  // Cloud Firestore App Check enforcement is enabled.
  //
  // If VITE_FIREBASE_APPCHECK_DEBUG_TOKEN is present in .env.local,
  // that exact registered token is reused. Otherwise Firebase creates
  // a browser-local token and prints it in DevTools so it can be
  // registered once in Firebase Console > App Check > Manage debug tokens.
  //
  // Production never uses the debug token branch.
  // ==========================================

  if (
    import.meta.env.DEV &&
    typeof globalThis !==
      "undefined"
  ) {

    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN =
      configuredDebugToken ||
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


      // Force one token request early so an invalid/unregistered local
      // debug token is reported clearly instead of looking like dozens of
      // unrelated Firestore rule failures later in the application.
      getToken(
        appCheck,
        true
      )
        .then(
          () => {
            console.info(
              `Firebase App Check token ready for project ${config.projectId}.`
            );
          }
        )
        .catch(
          error => {
            console.error(
              "Firebase App Check token was rejected. If you are on localhost and Firestore App Check enforcement is enabled, register the debug token printed above in Firebase Console > App Check > Manage debug tokens.",
              error
            );
          }
        );

    } catch (error) {

      console.error(
        "Unable to initialize Firebase App Check:",
        error
      );
    }

  } else {

    console.warn(
      "Firebase App Check is not configured. VITE_RECAPTCHA_ENTERPRISE_KEY is missing. If Firestore App Check enforcement is enabled, Firestore requests will be rejected until App Check is configured."
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


  if (import.meta.env.DEV) {
    console.info(
      `MindTrack Firebase project: ${config.projectId}`
    );
  }
}


export {
  app,
  auth,
  db,
  appCheck
};
