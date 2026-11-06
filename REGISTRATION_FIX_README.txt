MINDTRACK — REGISTRATION AND PROFILE PHONE VALIDATION FIX
Based on the source files uploaded on 2026-10-31.

WHAT WAS CHANGED
1. src/pages/auth/Register.jsx
   - Student / Employee Number is hidden until an account type is selected.
   - Switching account type clears the previous student/employee number.
   - Both personal and emergency-contact phone inputs accept 09XXXXXXXXX or +639XXXXXXXXX.
   - Duplicate phone numbers are rejected, including 09 and +639 equivalents.
   - An inline duplicate warning is shown near the emergency-contact input.
2. src/context/AuthContext.jsx
   - Both registration and profile update functions validate the same rules.
   - Both phone formats are normalized to 09XXXXXXXXX before saving,
     preserving compatibility with existing 11-digit database records.
3. src/App.jsx
   - Profile editing accepts +639 and rejects identical contact numbers.
4. src/utils/philippineMobile.js
   - Shared sanitization, validation, normalization and comparison functions.
5. tests/philippineMobile.test.mjs
   - Automated phone-format and duplicate-number tests.

HOW TO APPLY (RECOMMENDED: CHANGED FILES ZIP)
1. In VS Code, open the actual MindTrack project folder.
2. Back up src/App.jsx, src/context/AuthContext.jsx and
   src/pages/auth/Register.jsx outside the repository.
3. Extract MindTrack_Registration_Fix_Changed_Files.zip INTO THE PROJECT ROOT.
   Keep the src/ folder structure. Allow overwrite of these 3 files.
   The new src/utils/philippineMobile.js must also be copied.
4. In PowerShell, from the project root:
      node --test tests/philippineMobile.test.mjs
      npm run build
   Both must succeed before committing or deploying.
5. Test registration locally (npm run dev) with the cases below.
6. If everything works, stage ONLY the changed source/test files:
      git add -- src/App.jsx src/context/AuthContext.jsx src/pages/auth/Register.jsx src/utils/philippineMobile.js tests/philippineMobile.test.mjs
      git diff --cached --check
      git commit -m "Fix MindTrack registration phone validation and account number visibility"
      git push origin main
   The Vercel project should deploy automatically if main is its production branch.

MANUAL TESTS
A. Registration: account type unselected => number field hidden.
B. Student => Student Number required. Teaching / Non-teaching => Employee Number required.
C. Switching Student -> Teaching clears previous number.
D. Personal 09123456789 + emergency +639123456789 => reject.
E. Personal +639123456789 + emergency 09987654321 => allow.
F. Bad phone numbers (missing digit, 08 prefix, +6309 prefix) => reject.
G. Edit Profile: accepts +639 and rejects same number in different formats.
H. Existing assessment, counseling, referrals and role-based access still work.

IMPORTANT NOTES
- No SQL migration is included or needed for these UI/client validation changes.
- Duplicate prevention here is in the application code; it is NOT a new
  PostgreSQL CHECK constraint. If server-side enforcement is required,
  the actual database schema must be reviewed first.
- Email verification and password-reset redirect fixes were intentionally
  NOT changed in this package; those are a separate issue.
- The supplied environment variable names remain unchanged.
- This package was syntax-checked and its phone-number tests passed.
  A Vite production build could not be executed in this environment because
  npm dependencies were not available to install; run npm run build locally.
- Do not upload or commit .env, .env.local, service-account files or secrets.
