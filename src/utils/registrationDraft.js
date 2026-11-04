/**
 * One-tab, in-memory registration draft for the Privacy Notice round trip.
 * This intentionally does NOT use localStorage, sessionStorage, URL params,
 * or the backend: passwords and personal data must not be persisted there.
 * A full browser reload or a new tab will not restore the draft.
 */
let pendingDraft = null;

export function saveRegistrationDraft({ form, privacyAccepted, regions, provinces, municipalities, barangays }) {
  pendingDraft = {
    form: { ...form },
    privacyAccepted: Boolean(privacyAccepted),
    regions: [...regions],
    provinces: [...provinces],
    municipalities: [...municipalities],
    barangays: [...barangays]
  };
}

export function peekRegistrationDraft() {
  return pendingDraft;
}

export function clearRegistrationDraft() {
  pendingDraft = null;
}
