---
id: SCN-04
owasp_primary: "A01:2025 - Broken Access Control"
owasp_secondary:
  - "A02:2025 - Cryptographic Failures"
---

# SCN-04: Ambiguous request parameters allow cross-user basket modification

## Summary
A basket write operation can be directed to a different user's basket when the request contains duplicate `BasketId` keys with different values in the raw JSON body. The authorization layer reads one value (the attacker's basket), while the business logic reads a different one (the victim's basket), bypassing access controls.

## OWASP Top 10 Mapping (2025)
- Primary: Broken Access Control
- Secondary: Parameter Injection / HTTP Request Smuggling

## What should be true (invariant)
Basket write operations must validate and use a single, unambiguous basket identifier bound to the authenticated user. Requests with duplicate/conflicting parameters must be rejected.

## Preconditions
- Two distinct users exist (User A and User B).
- Two isolated sessions are used (separate browser contexts).
- Both users have distinct basket IDs.

## Observation (high level)
- The basket write endpoint accepts requests containing duplicate `BasketId` keys in the JSON body.
- Different parsing layers interpret the parameters differently:
  - Validation layer: reads first `BasketId` parameter (attacker's own basket) → ✓ passes check
  - Business logic layer: reads last `BasketId` parameter (victim's basket) → bypasses check
- The server processes the request with 200 OK.
- User A's basket is modified despite the request originating from User B.

## Reproduction (no mechanics)
1. Confirm sessions are isolated using `GET /rest/user/whoami` from both sessions.
2. Record the distinct BasketIDs for User A and User B.
3. As User B, send a POST request to `/api/BasketItems/` with duplicate `BasketId` keys in the JSON body:
   ```
   POST /api/BasketItems/
   Content-Type: application/json
   
   {
     "ProductId": 6,
     "BasketId": "USER_B_BASKET",
     "BasketId": "USER_A_BASKET",
     "quantity": 1
   }
   ```
4. Verify outcome:
   - Request returns 200 OK (not 403 Forbidden).
   - User A's basket contains the newly added item.

## Impact
- Integrity breach: one user can tamper with another user’s shopping cart.
- Potential business impact: unwanted purchases, cart manipulation, financial fraud.
- Indicates insufficient parameter validation and broken object-level authorization.

## Suggested remediation
- Derive the target basket exclusively from the authenticated session/user on the server.
- Reject requests containing duplicate parameters (return 400 Bad Request).
- Normalize and validate all input parameters before processing.
- Add centralized request validation at the HTTP layer to prevent parameter ambiguity.

## OWASP Top 10 (2025) Mapping
- Categories:
  - **A01:2025 - Broken Access Control** — The endpoint fails to enforce ownership checks and allows cross-user modification of baskets through ambiguous/duplicate parameters.
  - **A02:2025 - Cryptographic Failures** — Parameter ambiguity and lack of integrity checks allow request manipulation without detection.
- References: https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/, https://owasp.org/Top10/2025/A02_2025-Cryptographic_Failures/
