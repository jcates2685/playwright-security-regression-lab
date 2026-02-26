---
id: SCN-02
owasp_primary: 'A06:2025 - Insecure Design'
owasp_secondary:
    - 'A04:2025 - Cryptographic Failures'
    - 'A10:2025 - Mishandling of Exceptional Conditions'
---

# SCN-02: Change Password uses unsafe request design

## Summary

The Change Password capability uses `GET /rest/user/change-password` and places password values in URL query parameters. This is the primary vulnerability. In API-direct calls, invalid inputs can return `500`, indicating brittle exception handling.

## What should be true (invariants)

1. Passwords must never be placed in URLs (query strings).
2. State-changing operations must not use GET.
3. Invalid input should return controlled 4xx responses, not server errors.

## What we observed

### UI-observed behavior (authenticated browser flow)

- Request shape:
    - `GET /rest/user/change-password?current=<...>&new=<...>&repeat=<...>`
- Wrong current password returns `401` in current local runs.
- Missing current password may be blocked client-side before submit (no request), depending on UI state.

### API-direct behavior (authenticated direct request)

- `GET /rest/user/change-password` with wrong current password can return `500`.
- `GET /rest/user/change-password` with missing/empty current password can return `500`.

## Reproduction

### A) UI evidence (primary)

1. Log in.
2. Navigate to Change Password.
3. Enter wrong current password + new/repeat, submit.
4. Observe in Network:
    - method is `GET`
    - URL contains `current=`, `new=`, `repeat=`

### B) API-direct evidence (error handling)

1. Use an authenticated session/token.
2. Call:
    - `GET /rest/user/change-password?current=<wrong>&new=<new>&repeat=<new>`
    - `GET /rest/user/change-password?new=<new>&repeat=<new>`
3. Observe `500` in affected runs.

## Expected result

- Endpoint uses POST/PATCH.
- Password values are sent in request body only.
- Invalid input/auth failures return stable 4xx responses.

## Actual result

- Endpoint uses GET with password values in query string.
- API-direct invalid input can trigger 500.

## Why this matters (impact)

- Secret exposure risk: URLs are logged in browser history, proxies, telemetry, and server logs.
- Reliability risk: 500 on common invalid input indicates brittle error handling and operational noise.
- Security posture risk: unsafe method/parameter design increases accidental leakage risk.

## Likely root cause

- Endpoint contract is designed around GET + query-string secrets.
- Error handling paths for invalid/missing input are inconsistent across execution paths.

## Suggested remediation

- Move endpoint to POST/PATCH.
- Put `currentPassword`, `newPassword`, `repeatPassword` in body.
- Return consistent controlled 4xx responses for invalid input.
- Add regression checks for method, URL hygiene, and error semantics.

## Notes for documentation hygiene

- Redact secrets in any logs:
    - `current=<redacted>&new=<redacted>&repeat=<redacted>`
- Never commit auth tokens.

## OWASP Top 10 (2025) Mapping

- **A04:2025 - Cryptographic Failures**: secrets in URLs increase disclosure risk.
- **A06:2025 - Insecure Design**: state-changing operation via GET with query-string credentials.
- **A10:2025 - Mishandling of Exceptional Conditions**: API-direct invalid-input flows can trigger 500.
- References: https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/, https://owasp.org/Top10/2025/A06_2025-Insecure_Design/, https://owasp.org/Top10/2025/A10_2025-Mishandling_of_Exceptional_Conditions/
