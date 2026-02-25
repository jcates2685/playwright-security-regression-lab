# Lab Notes – OWASP Juice Shop

> Last updated: 2026-02-01

## Context

Local OWASP Juice Shop instance running via Docker.

Two test users created:

- **User A**: usera@local.test
- **User B**: userb@local.test

Sessions isolated using separate browser contexts (normal + incognito).

Primary observation performed via browser DevTools  
(Network → Fetch/XHR, cache disabled during auth testing).

No payload manipulation; focus is on access control and object ownership.

---

## Quick summary

- Confirmed vulnerability: IDOR on order tracking endpoint (see Orders / Tracking)
- Other endpoints reviewed (Addresses, Basket, Payment methods) mostly enforce ownership
- Authentication flows include intentional Juice Shop challenges; password recovery allows user enumeration

## Quick links

- Test case: `docs/test-cases/SEC-AC-TRACK-ORDER.md` — Track order IDOR
- Test cases: `docs/test-cases/SEC-ERR-CHANGE-PASSWORD-SECRETS-IN-URL.md`, `docs/test-cases/SEC-ERR-CHANGE-PASSWORD-WRONG-CURRENT-500.md` — Change password tests

---

---

## Identity / Session

### GET /rest/user/whoami

- Purpose: returns current authenticated user context
- Verified behavior:
    - Correctly reflects the logged-in user
- Usage:
    - Used repeatedly to confirm auth context and avoid false positives
- Notes:
    - Critical for validating cross-user tests

---

## Basket / Cart

### Endpoints

- GET /rest/basket/{id}
- POST /api/BasketItems/

### Findings

- Each user is assigned a distinct basket ID
- Cross-access testing:
    - User B requesting User A’s basket returns **401 Unauthorized**
- Interpretation:
    - Ownership and authorization are enforced
    - No IDOR observed on basket read access

---

## Addresses (Saved Addresses)

### Endpoints

- GET /api/Addresss (list)
- GET /api/Addresss/{id} (detail/edit)

> Note: The API path uses `/api/Addresss` (the server naming includes the extra 's'). The heading above is corrected for readability.

### Initial hypothesis (later corrected)

- Numeric IDs suggested a potential IDOR
- Early testing appeared to return 200 for cross-user access

### Verified behavior

- After confirming auth context via `whoami` and validating token usage:
    - User B requesting User A’s address detail returns **401/403**
- Interpretation:
    - Ownership **is enforced** on address detail access
    - Earlier 200 responses were due to incorrect auth context

### Outcome

- No IDOR present on Addresses endpoints
- Investigation documented as a false positive avoided through auth verification

---

## Orders / Tracking

### Observed UI Route

- `/#/track-result?id=<orderId>`

> Note: This is a client-side route; backend behavior verified separately.

### Backend Endpoint

- **GET /rest/track-order/{orderId}**

### Verified Finding (Confirmed Vulnerability)

- User A places an order and receives a tracking link containing `orderId`
- User B (separate authenticated session) requests:
    - `GET /rest/track-order/<UserA.orderId>`
- Result:
    - **200 OK**
    - Full order details returned, including:
        - products and quantities
        - total price
        - delivery status / ETA
        - masked email identifying the order owner
        - internal references (`addressId`, `paymentId`)

### Interpretation

- Backend validates order existence but does **not** verify ownership
- This is a **Broken Object Level Authorization (IDOR)**

### Impact

- Anyone with a valid tracking ID can view another user’s order
- Tracking IDs may be shared, leaked, logged, or guessed
- Exposes purchase history and related metadata

### RCA

- Feature behavior was tested, but the authorization invariant (only the owner can view order details) was not tested on the tracking endpoint.

---

## Authentication (Known Vulnerabilities)

- Login accepts classic SQL injection payloads (e.g. `' OR 1=1 --`)
- Allows authentication without valid credentials, including admin access
- Behavior is intentional and challenge-driven in OWASP Juice Shop
- Not investigated further as part of access control analysis

---

## Reset Checklist (Ephemeral Lab)

1. `docker compose down && up`
2. Create User A and User B
3. Log in using isolated sessions
4. Confirm identity via `/rest/user/whoami`
5. Re-run targeted probes

---

## Key Investigation Principles (Learned)

- UI routes are not proof of authorization
- Always verify backend responses and status codes
- Always confirm auth context before concluding cross-user access
- A **200 OK** can still represent a security failure

---

### Ruled-out candidates

- Addresses detail endpoint
    - Initially suspected IDOR
    - Ownership verified after auth-context correction
    - No vulnerability present

---

## Payment Methods / Cards

- Observed: DELETE /api/Cards/{id}
- Cross-user test:
    - User B attempting DELETE /api/Cards/7 returned 401
- Interpretation:
    - Ownership/authorization enforced for card deletion

---

## Password Recovery – User Enumeration

### Observed Endpoint

- GET /rest/user/security-question?email=<email>

### Observation

- Entering an existing user’s email:
    - Request returns 200
    - UI advances (security question is displayed; additional fields enabled)
- Entering a non-existent email:
    - Request also returns 200
    - UI remains inactive (fields stay disabled; no message shown)

### Interpretation

- Although HTTP status codes are identical, the application’s visible behavior differs based on whether the email exists.
- This allows an observer to infer account existence via UI state changes.

### Classification

- User enumeration via password recovery flow
- Disclosure occurs through behavioral differences, not status codes

### Notes

- No authentication required
- No brute force or guessing needed
- Finding is suitable for invariant-based testing (“password recovery must not reveal account existence”)

---

> **Rule of thumb:**  
> If changing an object identifier returns another user’s data with a 200, authorization is missing — regardless of how normal the response looks.
