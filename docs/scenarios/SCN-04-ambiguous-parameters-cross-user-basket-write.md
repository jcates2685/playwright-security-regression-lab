---
id: SCN-04
owasp_primary: "A01:2025 - Broken Access Control"
owasp_secondary:
  - "A02:2025 - Cryptographic Failures"
---

# SCN-04: Ambiguous request parameters allow cross-user basket modification

## Summary
A basket write operation can be directed to a different user's basket when the request contains ambiguous/duplicate identifier parameters. The server accepts the request and applies the write to a basket not owned by the authenticated user.

## OWASP Top 10 Mapping (2025)
- Primary: Broken Access Control
- Secondary: Injection (parameter ambiguity)

## What should be true (invariant)
Basket write operations must be bound to the authenticated user, and requests with duplicate/ambiguous basket identifiers must be rejected or normalized safely.

## Preconditions
- Two distinct users exist (User A and User B).
- Two isolated sessions are used (separate browser contexts).
- Both users have empty baskets (recommended for clarity).

## Observation (high level)
- The basket write endpoint accepts requests where the basket identifier is supplied in an ambiguous way (duplicate/conflicting parameters).
- The server processes the request successfully (2xx).
- The resulting basket state change is observed in User B’s session, despite the request being initiated by User A.

## Reproduction (no mechanics)
1. Confirm sessions are isolated:
   - In both sessions, `GET /rest/user/whoami` reflects different users.
2. Record baseline basket state for A and B (empty/non-empty and visible contents).
3. Perform a basket item add operation as User A using a request that includes duplicate/ambiguous basket identifiers.
4. Verify outcome:
   - User B’s basket contents change.
   - User A’s basket contents do not reflect the change (or reflect a different change).

## Impact
- Integrity breach: one user can tamper with another user’s shopping cart.
- Potential business impact: unwanted purchases, cart manipulation, trust erosion.
- Indicates broken object-level authorization in write operations.

## Suggested remediation
- Derive the target basket exclusively from the authenticated session/user on the server.
- Reject requests containing duplicate/conflicting identifier parameters (return 400).
- Add centralized request validation to prevent parameter ambiguity from reaching business logic.

## OWASP Top 10 (2025) Mapping
- Categories:
  - **A01:2025 - Broken Access Control** — The endpoint fails to enforce ownership checks and allows cross-user modification of baskets through ambiguous/duplicate parameters.
  - **A02:2025 - Cryptographic Failures** — Parameter ambiguity and lack of integrity checks allow request manipulation without detection.
- References: https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/, https://owasp.org/Top10/2025/A02_2025-Cryptographic_Failures/
