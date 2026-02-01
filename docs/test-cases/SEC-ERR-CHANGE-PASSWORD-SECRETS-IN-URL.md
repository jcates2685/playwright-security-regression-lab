# Test Case: Password change does not expose secrets in URL

## Test ID
SEC-ERR-CHANGE-PASSWORD-SECRETS-IN-URL

## Category
Security / Error Handling

## Related Scenario
SCN-02-change-password-security-quality

---

## Purpose
Verify that password values are not transmitted via URL query parameters.

---

## Preconditions
- User is logged in

---

## Test Data
- currentPassword
- newPassword

---

## Test Steps
1. Navigate to Change Password.
2. Submit the form with any values.
3. Observe the network request.

**Expected Result:**
- Password values are not present in the URL.
- Request uses POST/PATCH with body payload.

**Actual Result:**
- Password values appear in URL query string.
- Request uses GET.

---

## Security Impact
- Exposure of credentials in logs, analytics, and referrer headers.
- Increased risk of credential leakage through shared links and browser history.

## Likely Root Cause
- Client or server uses GET with sensitive data in query parameters instead of a request body with POST/PATCH.

## Suggested Remediation
- Use POST or PATCH and submit passwords in the request body only.
- Ensure passwords are never logged or included in URLs; sanitize logs.
- Enforce TLS and secure headers.

---

## Regression Value
Retain this test to ensure sensitive values are never sent in URLs.

---

## Automation Notes (Future)
- Automate by performing the change-password flow and inspecting the captured HTTP requests to ensure no sensitive data appears in URLs.
