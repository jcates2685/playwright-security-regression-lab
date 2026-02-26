# Test Case: API direct wrong current password returns server 500

## Test ID

SEC-ERR-CHANGE-PASSWORD-WRONG-CURRENT-500

## Category

Security / Error Handling

## Related Scenario

SCN-02-change-password-security-quality

---

## Purpose

Ensure an invalid current password does not trigger a server error when calling the API directly.

---

## Scope

- API-level behavior (direct request), not UI form behavior.

---

## Preconditions

- Authenticated user session/token is valid.

---

## Test Data

- currentPassword_wrong
- newPassword

---

## Test Steps

1. Call:
    - `GET /rest/user/change-password?current=<wrong>&new=<new>&repeat=<new>`
2. Observe the response.

**Expected Result:**

- Response is 400 / 401 / 403.
- No server error or stack trace is exposed.

**Actual Result (API direct):**

- Response is HTTP 500.

---

## Security Impact

- 500 on common invalid input indicates brittle error handling.
- May expose internal behavior and create noisy operational logs.

## Likely Root Cause

- Unhandled exception path for invalid current password in the change-password endpoint.

## Suggested Remediation

- Return controlled 4xx for invalid credential input.
- Handle failure paths explicitly and avoid leaking internal exception details.

---

## Regression Value

Keep as a regression test to ensure invalid inputs never produce server errors.

---

## Automation Notes

- This case is API-specific.
- Automated in `tests/security/api/scn-02-change-password-api-error-handling.spec.ts` (API-direct evidence case).
