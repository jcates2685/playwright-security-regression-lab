---
id: SCN-03
owasp_primary: "A07:2025 - Authentication Failures"
owasp_secondary:
  - "A06:2025 - Insecure Design"
verified_by: GitHub Copilot
verified_on: 2026-02-02
---

# SCN-03: Password recovery reveals whether an account exists (user enumeration)

## Summary
The password recovery flow reveals whether an email is registered by changing UI behavior after requesting the security question. This allows account enumeration without needing to authenticate.

## What should be true (invariant)
Password recovery should not disclose whether an account exists for a given email.

## What we observed
When the user enters an email address in the password recovery page:

- For a real account email:
  - `GET /rest/user/security-question?email=<real>` returns 200
  - The UI displays the security question and enables the next fields

- For a non-existent email:
  - `GET /rest/user/security-question?email=<fake>` also returns 200
  - The UI remains inactive (fields stay disabled; no visible error message)

## Reproduction (UI)
Preconditions:
- OWASP Juice Shop running locally
- At least one known test user exists (e.g., userb@local.test)

Steps:
1. Navigate to Password Recovery.
2. Enter a known existing email and blur the field.
3. Observe:
   - Network request: `GET /rest/user/security-question?email=<existing>` (200)
   - UI advances (security question appears; fields enable)
4. Enter a clearly fake email (not registered) and blur the field.
5. Observe:
   - Network request: `GET /rest/user/security-question?email=<fake>` (200)
   - UI does not advance (fields remain disabled; no message)

## Why this matters
An attacker can use this behavior difference to confirm which emails are registered. This can increase the risk of targeted phishing, credential stuffing, and social engineering.

## Likely root cause
The API response (or UI logic) differs for existing vs non-existing accounts in a way that affects visible application behavior, even though the HTTP status code is the same.

## Suggested remediation
- Make the password recovery flow behavior consistent regardless of whether the email exists.
- Always return a generic, non-identifying response (and/or a generic message such as “If an account exists, instructions will be sent”).
- Avoid revealing user-specific security questions prior to authentication or additional verification.

## OWASP Top 10 (2025) Mapping
- Categories:
  - **A07:2025 - Authentication Failures** — Behavioral differences in the password recovery flow allow user enumeration (disclosing account existence).
  - **A06:2025 - Insecure Design** — The recovery flow's UI/UX design leaks information; a secure design should provide consistent responses and avoid information disclosure.
- References: https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/, https://owasp.org/Top10/2025/A06_2025-Insecure_Design/
