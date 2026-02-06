# Test Case: Basket writes must reject ambiguous identifiers and prevent cross-user modification

## Test ID
SEC-AC-REJECT-AMBIGUOUS-BASKET-IDENTIFIERS

## Category
Broken Access Control / Request Validation

## Related Scenario
SCN-05-ambiguous-parameters-cross-user-basket-write

---

## Security Invariant
A user must not be able to modify another user’s basket. Requests that specify basket identity ambiguously (duplicate/conflicting identifiers) must be rejected or handled safely.

---

## Preconditions
- Two users: User A and User B.
- Two isolated sessions (A and B).
- Known baseline basket state for both users.

---

## Steps (conceptual, no exploit mechanics)
1. Capture baseline:
   - Read basket contents for User A
   - Read basket contents for User B
2. As User A, submit a basket add-item request that contains duplicate/conflicting basket identifiers.
3. Re-read basket contents for both users.

---

## Expected Result
- The server rejects the request with a stable 4xx (preferred: 400 Bad Request).
- No basket contents change for either user.
- If the system chooses to normalize instead of reject:
  - the write must apply only to User A’s basket
  - and must never affect User B

---

## Actual Result (Observed)
- The request is accepted (2xx).
- User B’s basket contents change as a result of User A’s request.

---

## Security / Quality Impact
- Cross-user tampering through request ambiguity.
- Demonstrates that identifier parsing/validation is not safely enforced at API boundaries.

---

## Suggested Remediation
- Bind basket selection to the authenticated user on the server.
- Reject ambiguous identifier inputs (duplicate/conflicting parameters).
- Add regression tests at the API boundary to prevent parsing inconsistencies across proxies/frameworks.

---

## Automation Notes (Future)
- API test with two sessions:
  - baseline read A + B
  - submit ambiguous identifier request as A
  - assert:
    - response is 4xx OR B is unchanged
    - B must never change due to A’s write
