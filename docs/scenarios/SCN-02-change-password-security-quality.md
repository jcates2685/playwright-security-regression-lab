# SCN-02: Change Password has unsafe request design and brittle error handling

## Summary
The Change Password flow sends sensitive password values in the URL query string and returns HTTP 500 for common user input errors (wrong/missing current password). This is primarily a security-quality issue: unsafe handling of secrets + inconsistent error handling.

## What should be true (invariants)
1. Passwords must not be placed in URLs (query strings).
2. Invalid user input must return a controlled 4xx response (e.g., 400/401/403), not a 500 server error.
3. State-changing operations should not use GET.

## What we observed
- The UI issues a request like:
  - `GET /rest/user/change-password?current=<...>&new=<...>&repeat=<...>`
- Entering a wrong current password results in:
  - `500 Internal Server Error`
- Leaving the current password blank/missing also results in:
  - `500 Internal Server Error`

## Reproduction (via UI, no special tooling)
Preconditions:
- Logged in as a normal user (User A or User B)

Steps:
1. Navigate to Change Password.
2. Enter a wrong current password, enter a new password + repeat, submit.
3. Observe the request in Network → Fetch/XHR and confirm:
   - endpoint is `GET /rest/user/change-password` with password values in query params
   - response status is 500

Repeat with current password blank/missing.

## Expected result
- Password change request uses POST/PATCH and places secrets in the request body (not URL).
- Wrong/missing current password returns a controlled 4xx response with a safe, user-readable error message.
- Server never throws 500 due to user input validation.

## Actual result
- Password change uses GET with secrets in the URL.
- Wrong/missing current password results in 500.

## Why this matters (impact)
- **Secret exposure risk:** URLs are commonly stored in browser history and logged by servers, proxies, and monitoring/telemetry systems.
- **Reliability / operability risk:** 500 responses for expected user errors create noisy logs and indicate unhandled exceptions.
- **Security posture risk:** brittle validation paths can lead to inconsistent behavior and complicate incident response.

## Likely root cause (high level)
- Input validation and error handling for the change-password handler do not properly handle wrong/missing values.
- Endpoint design uses query string parameters for secrets and an unsafe HTTP method (GET).

## Suggested remediation
- Change the endpoint to POST/PATCH.
- Put `currentPassword`, `newPassword`, `repeatPassword` in the request body.
- Validate inputs and return consistent 4xx responses for user mistakes.
- Ensure the UI displays a safe, human-readable error message (no raw object dumps).
- Add regression tests to ensure invalid inputs never produce 500.

## Notes for documentation hygiene
- Redact password values in any logs or notes:
  - `current=<redacted>&new=<redacted>&repeat=<redacted>`
- Never commit tokens or authorization headers.
