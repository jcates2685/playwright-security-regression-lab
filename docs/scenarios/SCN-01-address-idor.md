# SCN-01: Address Detail IDOR (Broken Object Level Authorization)

## Invariant
A user must not be able to access another user's saved address data.

## Preconditions
- Two users exist (User A and User B)
- Each user has at least one saved address
- Sessions are isolated (separate browser contexts)

## Steps to Reproduce
1. Log in as User A and note address ID (e.g., id 7)
2. Log in as User B in a separate session
3. Perform an XHR GET request to /api/Addresss/7 using User B’s session

## Expected Result
- Request is rejected with 401 or 403

## Actual Result
- Request succeeds with 200 OK
- Address data belonging to User A is returned

## Impact
- Unauthorized disclosure of user PII (addresses)
- Enables enumeration and bulk data exposure

## Root Cause (Hypothesis)
- Backend validates object existence but not ownership
- Authorization is not scoped to the authenticated user

## Remediation Guidance
- Enforce ownership checks on address detail access
- Scope address queries by authenticated user ID
- Add automated authorization tests for cross-user access
