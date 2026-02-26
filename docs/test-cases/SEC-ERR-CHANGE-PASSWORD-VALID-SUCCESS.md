# Test Case: Valid password change succeeds (control)

## Test ID

SEC-ERR-CHANGE-PASSWORD-VALID-SUCCESS

## Category

Security / Error Handling

## Related Scenario

SCN-02-change-password-security-quality

---

## Purpose

Verify that a valid password change succeeds and that the user's credentials are updated.

---

## Preconditions

- User is logged in

---

## Test Data

- currentPassword_correct
- newPassword

---

## Test Steps

1. Enter the correct current password and a valid new password.
2. Submit the change-password form.
3. Log out and log in with the new password.

**Expected Result:**

- Password change succeeds.
- The user can authenticate using the new password.

**Actual Result:**

- Password change succeeded; the user was able to log in successfully with the new password.

---

## Security Impact

- Ensures users can rotate credentials safely and that authentication state remains consistent.

## Likely Root Cause

- N/A for expected passing test; used as a control to detect regressions.

## Suggested Remediation

- N/A beyond fixing failures detected by this control.

---

## Regression Value

Important control case to catch regressions affecting the password change flow.

---

## Automation Notes (Future)

- Automate by performing change-password with seeded test accounts and verifying authentication with new credentials.
