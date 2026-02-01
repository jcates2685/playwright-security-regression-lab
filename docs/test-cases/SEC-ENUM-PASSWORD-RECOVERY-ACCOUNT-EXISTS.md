# Test Case: Password recovery must not reveal whether an account exists

## Test ID
SEC-ENUM-PASSWORD-RECOVERY-ACCOUNT-EXISTS

## Category
Security / Privacy / User Enumeration

## Related Scenario
SCN-03-password-recovery-user-enumeration

---

## Security Invariant
Password recovery must not disclose whether an account exists for a given email (via status codes, response content, or UI behavior).

---

## Preconditions
- OWASP Juice Shop is running.
- At least one known user exists (e.g., User B: userb@local.test).
- Access to DevTools (Network → Fetch/XHR).

---

## Test Data
- `email_existing`: a known registered email (e.g., userb@local.test)
- `email_fake`: a clearly non-existent email (e.g., no-such-user-12345@local.test)

---

## Steps
1. Navigate to Password Recovery.
2. Open DevTools → Network → Fetch/XHR.
3. Enter `email_existing` and blur the email field.
4. Record:
   - request: `GET /rest/user/security-question?email=<...>`
   - status code
   - UI behavior (do fields enable? does a question appear?)
5. Enter `email_fake` and blur the email field.
6. Record:
   - request: `GET /rest/user/security-question?email=<...>`
   - status code
   - UI behavior

---

## Expected Result
- The UI behaves the same for `email_existing` and `email_fake` (no identifiable differences).
- The application does not reveal a user-specific security question based solely on email.
- Response/status and user-visible behavior do not allow an observer to infer whether the email is registered.

---

## Actual Result (Observed)
- For `email_existing`:
  - Request returns 200
  - UI advances: security question is shown and additional fields become enabled
- For `email_fake`:
  - Request returns 200
  - UI remains inactive: fields stay disabled and no message is shown

---

## Security / Quality Impact
- Enables account enumeration by observing UI state changes.
- Increases risk of targeted phishing and credential stuffing against known valid accounts.
- Exposes account-specific recovery metadata (security question) prior to authentication.

---

## Suggested Remediation
- Normalize behavior for existing and non-existing emails:
  - same status, same response shape, same UI behavior
- Display a generic message regardless of email existence.
- Avoid revealing account-specific recovery hints/questions before stronger verification.

---

## Regression Value
Prevents reintroduction of account enumeration through password recovery UI behavior.

---

## Automation Notes (Future)
- UI automation:
  - assert that entering existing vs fake email results in identical UI state transitions
- API checks (if applicable):
  - assert response body/shape does not differ in a way that changes UI behavior
