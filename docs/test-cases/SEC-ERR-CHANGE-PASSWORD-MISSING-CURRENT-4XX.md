# Test Case: Missing current password returns controlled 4xx

## Test ID
SEC-ERR-CHANGE-PASSWORD-MISSING-CURRENT-4XX

## Category
Security / Error Handling

## Related Scenario
SCN-02-change-password-security-quality

---

## Purpose
Ensure that omitting the current password results in a controlled client error and not a server error.

---

## Preconditions
- User is logged in

---

## Test Data
- newPassword

---

## Test Steps
1. Leave the current password field blank.
2. Submit the change-password form.
3. Observe the response.

**Expected Result:**
- Response is 400 / 401 / 403.
- A validation message is presented to the user indicating the missing field.
- No server error occurs.

**Actual Result:**
- Response is HTTP 500.

---

## Security Impact
- Missing validation can lead to unexpected server behavior and may expose internal errors.
- Attackers may exploit such errors for information leakage or service disruption.

## Likely Root Cause
- Input validation not enforced on the server side, leading to an unhandled condition.

## Suggested Remediation
- Add server-side validation to ensure required fields are present and return appropriate 4xx errors.
- Ensure error messages are user-friendly and do not leak internal details.

---

## Regression Value
Retain to ensure required-field validation remains enforced and server stability is maintained.

---

## Automation Notes (Future)
- Automate by submitting requests missing required fields and asserting proper 4xx responses are returned.
