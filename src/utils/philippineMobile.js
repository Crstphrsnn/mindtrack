// Shared phone rules for MindTrack registration and profile editing.
// Accept 09XXXXXXXXX and +639XXXXXXXXX; retain the existing 11-digit
// local storage format to remain compatible with existing profile records.
export const PH_MOBILE_INPUT_PATTERN = "(?:09[0-9]{9}|\\+639[0-9]{9})";
export const PH_MOBILE_FORMAT_ERROR =
  "Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).";

export function sanitizePhilippineMobileInput(value) {
  const raw = String(value ?? "").replace(/[^0-9+]/g, "");

  if (raw.startsWith("+")) {
    return `+${raw.slice(1).replace(/\D/g, "").slice(0, 12)}`;
  }

  return raw.replace(/\D/g, "").slice(0, 11);
}

export function normalizePhilippineMobile(value) {
  // Also handle commonly pasted spaces, dashes and parentheses.
  const raw = String(value ?? "").trim().replace(/[\s()-]/g, "");

  if (/^09\d{9}$/.test(raw)) {
    return raw;
  }

  if (/^\+639\d{9}$/.test(raw)) {
    return `0${raw.slice(3)}`;
  }

  return "";
}

export function areSamePhilippineMobileNumbers(first, second) {
  const normalizedFirst = normalizePhilippineMobile(first);
  const normalizedSecond = normalizePhilippineMobile(second);
  return Boolean(normalizedFirst && normalizedSecond && normalizedFirst === normalizedSecond);
}
