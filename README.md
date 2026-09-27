MINDTRACK COUNSELOR TRANSFER WORKFLOW UPDATE

Replace:
1. App_COUNSELOR_TRANSFER_FIXED.jsx -> src/App.jsx
2. Layout_COUNSELOR_TRANSFER_FIXED.jsx -> src/components/Layout.jsx
3. UserProfileFullScreen_COUNSELOR_TRANSFER_FIXED.jsx -> src/components/UserProfileFullScreen.jsx
4. styles_COUNSELOR_TRANSFER_FIXED.css -> src/styles.css
5. dataService_COUNSELOR_TRANSFER_FIXED.js -> src/services/dataService.js
6. firestore_rules_COUNSELOR_TRANSFER_FIXED.rules -> Firebase Firestore Rules, then Publish

NEW FEATURE
- Scheduled counseling requests handled by a counselor show "Request counselor transfer" before the counseling session starts.
- A reason is required before sending the transfer request.
- Transfer does not take effect immediately. Status is Pending approval.
- Every other counselor receives a notification and sees the pending transfer on the Counselor Dashboard.
- The first counselor who accepts becomes the assigned counselor.
- The accepting counselor receives transferAccess to the user's profile, counseling history, and assessment history.
- The user is notified when transfer is requested and when it is approved.
- The previous counselor is notified when another counselor accepts.
- Transfer history stays in transferRequests and the consultation keeps transferred-from fields for documentation.
- The original/source-college counselor still retains read access through the normal department rules.
- Cross-college assigned users show a Transferred badge at the top of User Profile.
- User Profiles now include a Transfer Status filter: All Users / Transferred / Not Transferred.
- Counselor User Profiles include users formally transferred to that counselor, even from another college.
- Super Admin can filter transferred users system-wide.
- Counselor Notifications is added to the sidebar and includes transfer requests/status updates.

IMPORTANT WORKFLOW
1. Counselor schedules counseling request.
2. Before session starts, assigned counselor clicks Request counselor transfer.
3. Other counselors see the pending transfer on Dashboard and Notifications.
4. Another counselor clicks Accept transfer.
5. Firestore atomically records approval, changes assigned counselor, creates transfer access, and preserves previous counselor information.
6. User receives the new counselor update.
7. New counselor can open the transferred user's profile and histories.

NEW FIRESTORE COLLECTIONS
- transferRequests
- transferAccess

TEST
1. Publish updated Firestore Rules.
2. Replace all five source files.
3. npm run dev
4. Log in as Counselor A and schedule a request.
5. Confirm Request counselor transfer appears only before the appointment starts.
6. Submit transfer reason.
7. Log in as Counselor B. Check dashboard and Notifications.
8. Accept the transfer.
9. Open User Profiles as Counselor B and confirm the user is accessible.
10. If Counselor B is from another college, confirm Transferred badge appears on the profile.
11. Confirm Counseling Requests / Schedule contains the transferred assigned request.
12. Log in as the user and confirm transfer notifications.
13. Check Super Admin User Profiles -> Transfer Status -> Transferred.
14. npm run build
