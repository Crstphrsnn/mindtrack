import test from "node:test";
import assert from "node:assert/strict";
import {
  isEmailVerificationCallbackUrl,
  hasEmailVerificationLinkError,
  completeEmailVerification
} from "../src/utils/emailVerificationFlow.js";

test("recognizes dedicated and legacy signup redirects", () => {
  assert.equal(isEmailVerificationCallbackUrl("https://mindtrack-tawny.vercel.app/auth/confirm?code=abc"), true);
  assert.equal(isEmailVerificationCallbackUrl("https://mindtrack-tawny.vercel.app/login?mindtrack_verified=1"), true);
  assert.equal(isEmailVerificationCallbackUrl("https://mindtrack-tawny.vercel.app/#access_token=abc&type=signup"), true);
});

test("never classifies password recovery or normal login as confirmation", () => {
  assert.equal(isEmailVerificationCallbackUrl("https://mindtrack-tawny.vercel.app/reset-password?code=abc"), false);
  assert.equal(isEmailVerificationCallbackUrl("https://mindtrack-tawny.vercel.app/login?mode=recovery"), false);
  assert.equal(isEmailVerificationCallbackUrl("https://mindtrack-tawny.vercel.app/login"), false);
  assert.equal(isEmailVerificationCallbackUrl("https://mindtrack-tawny.vercel.app/#access_token=abc&type=recovery"), false);
});

test("detects expired confirmation links", () => {
  assert.equal(hasEmailVerificationLinkError("https://mindtrack-tawny.vercel.app/auth/confirm?error=access_denied"), true);
  assert.equal(hasEmailVerificationLinkError("https://mindtrack-tawny.vercel.app/auth/confirm?code=abc"), false);
});

test("confirmed email ends the temporary local session before manual login", async () => {
  const calls = [];
  const auth = {
    async getSession() {
      calls.push("getSession");
      return { data: { session: { user: { email_confirmed_at: "2026-10-31T00:00:00Z" } } }, error: null };
    },
    async signOut(options) {
      calls.push(["signOut", options]);
      return { error: null };
    }
  };
  assert.equal(await completeEmailVerification(auth, "https://mindtrack-tawny.vercel.app/auth/confirm"), "verified");
  assert.deepEqual(calls, ["getSession", ["signOut", { scope: "local" }]]);
});

test("expired or missing session never reports verified, but still signs out", async () => {
  let signedOut = false;
  const auth = {
    async getSession() { return { data: { session: null }, error: null }; },
    async signOut() { signedOut = true; return { error: null }; }
  };
  assert.equal(await completeEmailVerification(auth, "https://mindtrack-tawny.vercel.app/auth/confirm?error=access_denied"), "not_verified");
  assert.equal(signedOut, true);
});

test("sign-out errors never allow a success redirect", async () => {
  const auth = {
    async getSession() { return { data: { session: { user: { email_confirmed_at: "now" } } }, error: null }; },
    async signOut() { return { error: new Error("sign-out failed") }; }
  };
  await assert.rejects(
    () => completeEmailVerification(auth, "https://mindtrack-tawny.vercel.app/auth/confirm"),
    /sign-out failed/
  );
});
