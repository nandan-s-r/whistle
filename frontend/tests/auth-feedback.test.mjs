import assert from "node:assert/strict";
import test from "node:test";
import { authFailureMessage, needsEmailConfirmation } from "../src/lib/authFeedback.ts";

test("unconfirmed email offers confirmation rather than claiming the password is wrong", () => {
  const error = {code:"email_not_confirmed", status:400};
  assert.match(authFailureMessage(error), /Confirm your email/);
  assert.equal(needsEmailConfirmation(error), true);
  assert.equal(needsEmailConfirmation({code:"invalid_credentials"}), false);
  assert.equal(needsEmailConfirmation(null), false);
});

test("invalid cloud credentials explain separate account modes and recovery", () => {
  assert.match(authFailureMessage({code:"invalid_credentials"}), /Forgot password/);
  assert.match(authFailureMessage({code:"invalid_credentials"}), /Local preview accounts are separate/);
});

test("rate limits and service failures never imply an incorrect password", () => {
  for (const error of [{status:429}, {code:"over_request_rate_limit"}, {code:"over_email_send_rate_limit"}])
    assert.match(authFailureMessage(error), /Wait a few minutes/);
  for (const error of [{status:503}, {name:"AuthRetryableFetchError"}, new TypeError("private transport detail")])
    assert.match(authFailureMessage(error), /Cannot reach/);
  assert.match(authFailureMessage({code:"request_timeout"}), /too long/);
});

test("provider email restrictions and account restrictions remain distinct", () => {
  assert.match(authFailureMessage({code:"email_address_not_authorized"}, "email"), /administrator/);
  assert.match(authFailureMessage({code:"user_banned"}), /restricted/);
});

test("unknown provider data never appears in sign-in or recovery feedback", () => {
  for (const error of [new Error("secret request contents"), {code:"unknown", message:"secret request contents"}, null, "secret request contents"])
    for (const action of ["sign-in", "email"])
      assert.doesNotMatch(authFailureMessage(error, action), /secret request contents/);
  assert.match(authFailureMessage(null, "email"), /Could not send/);
});
