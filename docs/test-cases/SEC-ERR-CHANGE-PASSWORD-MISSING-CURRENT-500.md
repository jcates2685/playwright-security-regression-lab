# Test Case: API direct missing current password returns server 500

## Test ID

SEC-ERR-CHANGE-PASSWORD-MISSING-CURRENT-500

## Category

Security / Error Handling

## Related Scenario

SCN-02-change-password-security-quality

---

## Purpose

Ensure missing required current password does not trigger a server error when calling the API directly.

---

## Scope

- API-level behavior (direct request), not UI form behavior.

---

## Preconditions

- Authenticated user session/token is valid.

---

## Test Data

- newPassword

---

## Test Steps

1. Call:
    - `GET /rest/user/change-password?new=<new>&repeat=<new>`
    - or `current=` empty
2. Observe the response.

**Expected Result:**

- Response is 400 / 401 / 403.
- No server error occurs.

**Actual Result (API direct):**

- Response is HTTP 500.

---

## Security Impact

- Missing-field validation path can cause unexpected server errors.
- May expose internals and reduce service reliability.

## Likely Root Cause

- Missing required-field validation and/or exception handling in endpoint logic.

## Suggested Remediation

- Enforce required-field validation server-side and return controlled 4xx.
- Keep error responses stable and user-safe.

---

## Regression Value

Retain to ensure required-field validation remains enforced and server stability is maintained.

---

## Automation Notes

- This case is API-specific.
- Automated in `tests/security/api/scn-02-change-password-api-error-handling.spec.ts` (API-direct evidence case).
