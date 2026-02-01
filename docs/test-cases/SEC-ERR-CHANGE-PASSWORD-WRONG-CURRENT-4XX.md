# Test Case: Wrong current password returns controlled 4xx

## Test ID
SEC-ERR-CHANGE-PASSWORD-WRONG-CURRENT-4XX

## Category
Security / Error Handling

## Related Scenario
SCN-02-change-password-security-quality

---

## Purpose
Ensure an invalid current password does not cause a server error and returns a controlled 4xx response.

---

## Preconditions
- User is logged in

---

## Test Data
- currentPassword_wrong
- newPassword

---

## Test Steps
1. Enter an incorrect current password.
2. Submit the change-password form.
3. Observe the response.

**Expected Result:**
- Response is 400 / 401 / 403.
- A friendly validation message is shown to the user.
- No server error or stack trace is exposed.

**Actual Result:**
- Response is HTTP 500.

---

## Security Impact
- Server errors may expose stack traces or internal implementation details.
- Denial of service or account confusion due to unstable error handling.

## Likely Root Cause
- Unhandled exception or improper error handling for authentication failures.
- Missing validation for incorrect credentials.

## Suggested Remediation
- Return a controlled 4xx response for authentication/authorization failures.
- Implement proper error handling and logging without leaking internal details.
- Add unit and integration tests for failure paths.

---

## Regression Value
Keep as a regression test to ensure failures return proper 4xx statuses and do not cause server errors.

---

## Automation Notes (Future)
- Automate by submitting an invalid current password and asserting the service returns an expected 4xx without server trace or 5xx errors.
