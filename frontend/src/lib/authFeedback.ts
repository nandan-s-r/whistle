type AuthAction = "sign-in" | "email";

// Only display known guidance. Provider messages can contain request details.
export function authFailureMessage(error: unknown, action: AuthAction = "sign-in"): string {
  const details = error && typeof error === "object"
    ? error as { code?: string; status?: number; name?: string }
    : {};
  if (details.status === 429 || details.code === "over_request_rate_limit" || details.code === "over_email_send_rate_limit")
    return "Too many attempts. Wait a few minutes before trying again.";
  if (details.code === "email_not_confirmed")
    return "Confirm your email before signing in. Open the confirmation link in your inbox or spam folder, or request another below.";
  if (details.code === "invalid_credentials")
    return "The email or password does not match this cloud account. Use your cloud account password, or choose Forgot password. Local preview accounts are separate.";
  if (details.code === "email_address_not_authorized" || details.code === "email_provider_disabled")
    return "Email access is unavailable for this account. The workspace administrator needs to check the email service settings.";
  if (details.code === "user_banned")
    return "Sign-in is restricted for this account. Contact the workspace administrator.";
  if (details.code === "request_timeout" || details.name === "TimeoutError" || details.name === "AbortError")
    return "The sign-in service took too long to respond. Please try again.";
  if (details.name === "AuthRetryableFetchError" || details.name === "TypeError" || (details.status !== undefined && details.status >= 500))
    return "Cannot reach the sign-in service right now. Check your connection and try again shortly.";
  return action === "email"
    ? "Could not send the email. Please try again shortly."
    : "Sign-in could not be completed. Please try again shortly.";
}

export function needsEmailConfirmation(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "email_not_confirmed";
}
