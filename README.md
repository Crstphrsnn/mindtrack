# MindTrack Realtime Capstone System

## Recommended capstone technology

- **Programming language:** JavaScript
- **Frontend framework:** React.js with Vite
- **Database and backend services:** Firebase Authentication + Cloud Firestore
- **UI:** HTML5 and CSS3
- **Hosting:** Firebase Hosting or Vercel

This stack is defendable because the programming language is clear (JavaScript), React organizes the interface into reusable components, and Firestore supports live database listeners.

## Included roles

- Super Admin
- Counselor / Admin per college or department
- Student
- Faculty
- Personnel

## Included working modules

- Role-based login and dashboards
- Psychological assessment and weighted priority calculation
- Critical safety flag
- User consultation requests
- Counselor approval/status updates
- Faculty and personnel referral forms
- Case review, counselor remarks, and case status
- Appointment schedule
- User history
- Account overview
- Live reports
- Demo mode using localStorage
- Real-time Firebase mode using Firestore onSnapshot listeners

## Run immediately in demo mode

```bash
npm install
npm run dev
```

Open the local address shown by Vite.

Demo password for all accounts:

```text
password123
```

Accounts:

```text
counselor.cte@psu.edu.ph
counselor.cthm@psu.edu.ph
counselor.cit@psu.edu.ph
counselor.csl@psu.edu.ph
counselor.ccs@psu.edu.ph
counselor.cbpa@psu.edu.ph

```

## Enable real-time Firebase

1. Create a Firebase project.
2. Enable Authentication > Email/Password.
3. Create Firestore Database.
4. Copy `.env.example` to `.env`.
5. Paste your Firebase web configuration values.
6. Create the five Authentication accounts.
7. Create matching documents in the `users` collection using each Authentication UID.

Example `users/{uid}` document:

```json
{
  "name": "CCS Guidance Counselor",
  "email": "counselor.ccs@psu.edu.ph",
  "role": "counselor",
  "department": "CCS"
}
```

## Firestore collections

- users
- assessments
- consultations
- referrals
- notifications

## Starter Firestore rules

Use these only as a development baseline. Review with your adviser before production.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function profile() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isSuperAdmin() {
      return signedIn() && profile().role == 'super_admin';
    }

    function isCounselor() {
      return signedIn() && profile().role == 'counselor';
    }

    match /users/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isSuperAdmin());
      allow write: if isSuperAdmin();
    }

    match /assessments/{id} {
      allow create: if signedIn() && request.resource.data.ownerId == request.auth.uid;
      allow read: if signedIn() && (
        resource.data.ownerId == request.auth.uid ||
        isSuperAdmin() ||
        (isCounselor() && resource.data.department == profile().department)
      );
      allow update: if isSuperAdmin() ||
        (isCounselor() && resource.data.department == profile().department);
    }

    match /consultations/{id} {
      allow create: if signedIn() && request.resource.data.ownerId == request.auth.uid;
      allow read: if signedIn() && (
        resource.data.ownerId == request.auth.uid ||
        isSuperAdmin() ||
        (isCounselor() && resource.data.department == profile().department)
      );
      allow update: if isSuperAdmin() ||
        (isCounselor() && resource.data.department == profile().department);
    }

    match /referrals/{id} {
      allow create: if signedIn() &&
        (profile().role == 'faculty' || profile().role == 'personnel');
      allow read: if signedIn() && (
        resource.data.referrerId == request.auth.uid ||
        isSuperAdmin() ||
        isCounselor()
      );
      allow update: if isSuperAdmin() || isCounselor();
    }

    match /notifications/{id} {
      allow create: if signedIn();
      allow read: if signedIn() && resource.data.ownerId == request.auth.uid;
    }
  }
}
```

## Important academic and ethical wording

The assessment result must be described as:

> A screening and decision-support output for monitoring and counseling support. It is not a medical or psychological diagnosis.

Validated psychological instruments and final thresholds must be reviewed and approved by qualified guidance or mental-health professionals before real deployment.
